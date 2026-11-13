import { DEMO_BALANCE_LIMIT, WAVE3_CATALOG_VERSION, WAVE3_EXPERIENCE_VERSION, validDemoEconomy } from './wave3-experience-contract.ts';
import type { ExperienceSnapshot, ExperienceResult, Wave3ExperiencePort, GameEvent, RaceCompletion, Wave3Status } from './wave3-experience-contract.ts';
import { DEMO_ELIGIBLE_MODES, DEMO_MISSION_CLAIM_REWARD, DEMO_START_POINTS, canAwardFirstFinish, demoMissionBonus, demoOffer, demoRaceReward, insufficientDemo } from './wave3-demo-settlement.ts';
import { MISSION_DEFINITIONS, createMissionPeriodState, missionPeriodBounds, projectMissionState, reduceMissionEvent } from './wave3-demo-missions.ts';

export type Wave3DemoCheckpoint = Readonly<{
  snapshot: ExperienceSnapshot;
  seenEvents: readonly string[];
  settledCompletions: readonly string[];
}>;
const BASE_GOALS: Readonly<Record<string, number>> = Object.freeze({
  'mission-race': 1, 'mission-time': 1, 'mission-drift': 2, 'mission-combo': 1,
});
const GOALS: Readonly<Record<string, number>> = Object.freeze({
  ...BASE_GOALS, ...Object.fromEntries(MISSION_DEFINITIONS.map(({ id, goal }) => [id, goal])),
});
const VALID_ACCOUNT = /^[A-Za-z0-9_-]{1,128}$/;
const VALID_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{3,159}$/;
const validId = (id: unknown): id is string => typeof id === 'string' && VALID_ID.test(id);
const validTime = (time: unknown): time is number => typeof time === 'number' && Number.isFinite(time) && time >= 0;

export function createWave3LocalDemo(options: { now?: () => number } = {}): Wave3ExperiencePort & {
  getCheckpoint(): Wave3DemoCheckpoint;
  restoreCheckpoint(value: Wave3DemoCheckpoint): ExperienceSnapshot | null;
} {
  const now = options.now ?? Date.now;
  const listeners = new Set<(value: ExperienceSnapshot) => void>();
  let accountId = 'guest', demoPoints = DEMO_START_POINTS, equippedPreview: string | null = null;
  let coins = 0, diamonds = 0, firstFinishes = new Set<string>();
  let seenEvents = new Set<string>(), settled = new Set<string>(), redeemed = new Set<string>();
  let period = createMissionPeriodState(accountId, now());
  const blankMissions = () => Object.fromEntries(Object.entries(GOALS).map(([id, goal]) =>
    [id, { progress: 0, goal, claimed: false, rewardDemoPoints: DEMO_MISSION_CLAIM_REWARD }]));
  let missions = blankMissions();
  const syncPeriods = () => {
    const bounds = missionPeriodBounds(now());
    if (bounds.dayStart === period.dayStart && bounds.weekStart === period.weekStart) return;
    const counts: Record<string, number> = {};
    for (const { id, cadence, goal } of MISSION_DEFINITIONS) {
      const expired = cadence === 'daily' ? bounds.dayStart !== period.dayStart : bounds.weekStart !== period.weekStart;
      if (expired) missions[id] = { progress: 0, goal, claimed: false, rewardDemoPoints: DEMO_MISSION_CLAIM_REWARD };
      counts[id] = missions[id].progress;
    }
    period = { ...period, ...bounds, counts };
  };
  const snapshot = (): ExperienceSnapshot => {
    syncPeriods();
    return Object.freeze({
    version: WAVE3_EXPERIENCE_VERSION, catalogVersion: WAVE3_CATALOG_VERSION,
    mode: 'local-demo' as const, authority: 'local' as const, syncState: 'local-only' as const,
    accountId, demoPoints, equippedPreview, updatedAt: now(),
    demoInventory: Object.freeze([...redeemed]),
    demoEconomy: Object.freeze({ coins, diamonds, firstFinishes: Object.freeze([...firstFinishes]) }),
    missions: Object.freeze(Object.fromEntries(Object.entries(missions).map(([id, progress]) => [id, Object.freeze({ ...progress })]))),
    });
  };
  const publish = () => { const value = snapshot(); for (const fn of listeners) fn(value); return value; };
  const result = (status: Wave3Status, deltaDemoPoints = 0, deltaDemoCoins = 0, deltaDemoDiamonds = 0): ExperienceResult =>
    ({ status, deltaDemoPoints, deltaDemoCoins, deltaDemoDiamonds, snapshot: snapshot() });
  const credit = (points: number, coinReward: number, diamondReward = 0): ExperienceResult => {
    const earnedPoints = Math.min(DEMO_BALANCE_LIMIT - demoPoints, points);
    const earnedCoins = Math.min(DEMO_BALANCE_LIMIT - coins, coinReward);
    const earnedDiamonds = Math.min(DEMO_BALANCE_LIMIT - diamonds, diamondReward);
    demoPoints += earnedPoints;
    coins += earnedCoins;
    diamonds += earnedDiamonds;
    return { status: 'completed', deltaDemoPoints: earnedPoints, deltaDemoCoins: earnedCoins,
      deltaDemoDiamonds: earnedDiamonds, snapshot: publish() };
  };
  const validScope = (value: { accountId?: string }) => value.accountId === undefined || value.accountId === accountId;
  const validEvent = (e: GameEvent) => e && e.schemaVersion === WAVE3_EXPERIENCE_VERSION && validId(e.eventId) &&
    validId(e.completionId) && validId(e.trackId) && validTime(e.occurredAt) &&
    ['finish', 'drift', 'combo'].includes(e.kind) && typeof e.mode === 'string' && typeof e.eligible === 'boolean' && validScope(e);
  const validCompletion = (c: RaceCompletion) => c && c.schemaVersion === WAVE3_EXPERIENCE_VERSION &&
    validId(c.completionId) && validId(c.trackId) && validTime(c.occurredAt) &&
    typeof c.mode === 'string' && typeof c.eligible === 'boolean' && validScope(c);
  const reset = () => {
    demoPoints = DEMO_START_POINTS; equippedPreview = null;
    coins = 0; diamonds = 0; firstFinishes = new Set();
    seenEvents = new Set(); settled = new Set(); redeemed = new Set();
    period = createMissionPeriodState(accountId, now());
    missions = blankMissions();
    return publish();
  };

  const validCheckpoint = (value: Wave3DemoCheckpoint) => {
    const incoming = value?.snapshot;
    if (!incoming || incoming.mode !== 'local-demo' || incoming.authority !== 'local' ||
      incoming.syncState !== 'local-only' || incoming.accountId !== accountId ||
      incoming.version !== WAVE3_EXPERIENCE_VERSION || incoming.catalogVersion !== WAVE3_CATALOG_VERSION ||
      !Number.isSafeInteger(incoming.demoPoints) || incoming.demoPoints < 0 || incoming.demoPoints > DEMO_BALANCE_LIMIT ||
      (Object.hasOwn(incoming, 'demoEconomy') && !validDemoEconomy(incoming.demoEconomy)) ||
      !Array.isArray(incoming.demoInventory) || incoming.demoInventory.length > 256 ||
      !incoming.demoInventory.every(id => demoOffer(id)) ||
      new Set(incoming.demoInventory).size !== incoming.demoInventory.length ||
      (incoming.equippedPreview !== null && !incoming.demoInventory.includes(incoming.equippedPreview)) ||
      !incoming.missions || ![Object.keys(GOALS).sort().join('|'), Object.keys(BASE_GOALS).sort().join('|')]
        .includes(Object.keys(incoming.missions).sort().join('|'))) return false;
    if (!Array.isArray(value.seenEvents) || !Array.isArray(value.settledCompletions) ||
      value.seenEvents.length > 1024 || value.settledCompletions.length > 1024 ||
      ![...value.seenEvents, ...value.settledCompletions].every(validId)) return false;
    return Object.entries(incoming.missions).every(([id, mission]) => {
      const goal = GOALS[id];
      return mission && mission.goal === goal && mission.rewardDemoPoints === DEMO_MISSION_CLAIM_REWARD &&
        Number.isSafeInteger(mission.progress) && mission.progress >= 0 && mission.progress <= goal &&
        typeof mission.claimed === 'boolean' && (!mission.claimed || mission.progress === goal);
    });
  };

  return {
    getCheckpoint: () => ({ snapshot: snapshot(), seenEvents: [...seenEvents], settledCompletions: [...settled] }),
    restoreCheckpoint(value) {
      if (!validCheckpoint(value)) return null;
      const incoming = value.snapshot;
      demoPoints = incoming.demoPoints;
      coins = incoming.demoEconomy?.coins ?? 0;
      diamonds = incoming.demoEconomy?.diamonds ?? 0;
      firstFinishes = new Set(incoming.demoEconomy?.firstFinishes);
      redeemed = new Set(incoming.demoInventory);
      equippedPreview = incoming.equippedPreview;
      seenEvents = new Set(value.seenEvents);
      settled = new Set(value.settledCompletions);
      missions = { ...blankMissions(), ...Object.fromEntries(Object.entries(incoming.missions)
        .map(([id, progress]) => [id, { ...progress }])) };
      period = { ...createMissionPeriodState(accountId, incoming.updatedAt),
        counts: Object.fromEntries(MISSION_DEFINITIONS.map(({ id }) => [id, missions[id].progress])),
        seenEventIds: [...seenEvents] };
      return publish();
    },
    getSnapshot: snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    setAccount(id) {
      const next = typeof id === 'string' && VALID_ACCOUNT.test(id) ? id : 'guest';
      if (next !== accountId) { accountId = next; return reset(); }
      return snapshot();
    },
    resetDemo: reset,
    recordGameEvent(event) {
      if (!validEvent(event)) return result('invalid');
      if (!event.eligible || !DEMO_ELIGIBLE_MODES.has(event.mode)) return result('ineligible');
      if (seenEvents.has(event.eventId)) return result('duplicate');
      syncPeriods();
      seenEvents.add(event.eventId);
      period = reduceMissionEvent(period, event, now());
      const latest = projectMissionState(period, now());
      for (const { id: periodId } of MISSION_DEFINITIONS) missions[periodId].progress = latest[periodId].progress;
      const id = event.kind === 'finish' ? (event.mode === 'time' ? 'mission-time' : 'mission-race') : `mission-${event.kind}`;
      const mission = missions[id];
      if (mission) mission.progress = Math.min(mission.goal, mission.progress + 1);
      publish();
      return result('completed');
    },
    settleCompletion(completion) {
      if (!validCompletion(completion)) return result('invalid');
      if (!completion.eligible || !DEMO_ELIGIBLE_MODES.has(completion.mode)) return result('ineligible');
      if (settled.has(completion.completionId)) return result('duplicate');
      const points = demoRaceReward(completion.demoRace);
      settled.add(completion.completionId);
      const first = firstFinishes.size < 128 && !firstFinishes.has(completion.trackId) &&
        canAwardFirstFinish(completion.trackId);
      if (first) firstFinishes.add(completion.trackId);
      return credit(points, 2 * points + (first ? 30 : 0));
    },
    claimMission(missionId) {
      const mission = Object.hasOwn(missions, missionId) ? missions[missionId] : null;
      if (!mission) return result('invalid');
      if (mission.claimed) return result('duplicate');
      if (mission.progress < mission.goal) return result('ineligible');
      mission.claimed = true;
      const bonus = demoMissionBonus(missionId);
      return credit(mission.rewardDemoPoints, bonus.coins, bonus.diamonds);
    },
    redeemPreview(itemId) {
      const offer = demoOffer(itemId);
      if (!offer) return result('invalid');
      if (redeemed.has(itemId)) return result('duplicate');
      const { currency, cost } = offer;
      const balance = currency === 'points' ? demoPoints : currency === 'coins' ? coins : diamonds;
      if (balance < cost) return result(insufficientDemo(currency));
      if (currency === 'points') demoPoints -= cost;
      if (currency === 'coins') coins -= cost;
      if (currency === 'diamonds') diamonds -= cost;
      redeemed.add(itemId);
      return { status: 'completed', snapshot: publish(), deltaDemoPoints: currency === 'points' ? -cost : 0,
        deltaDemoCoins: currency === 'coins' ? -cost : 0, deltaDemoDiamonds: currency === 'diamonds' ? -cost : 0 };
    },
    equipPreview(itemId) {
      if (!redeemed.has(itemId)) return result('ineligible');
      if (equippedPreview === itemId) return result('duplicate');
      equippedPreview = itemId; publish(); return result('completed');
    },
  };
}
