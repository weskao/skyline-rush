import { DEMO_BALANCE_LIMIT, DEMO_QUOTE_LIFETIME_MS, DEMO_RETENTION_MS, DEMO_REPLAY_LIMIT, WAVE3_CATALOG_VERSION, WAVE3_EXPERIENCE_VERSION, sameDemoScope, validDemoEconomy } from './wave3-experience-contract.ts';
import type { ExperienceSnapshot, ExperienceResult, Wave3ExperiencePort, GameEvent, RaceCompletion, Wave3Status, DemoOperationScope, DemoRedemptionQuote } from './wave3-experience-contract.ts';
import { DEMO_ELIGIBLE_MODES, DEMO_MISSION_CLAIM_REWARD, DEMO_START_POINTS, canAwardFirstFinish, demoMissionBonus, demoOffer, demoRaceReward, insufficientDemo } from './wave3-demo-settlement.ts';
import { MISSION_DEFINITIONS, createMissionPeriodState, missionPeriodBounds, missionPeriodId, projectMissionState, reduceMissionEvent } from './wave3-demo-missions.ts';

export type Wave3DemoCheckpoint = Readonly<{
  snapshot: ExperienceSnapshot;
  seenEvents: readonly string[];
  settledCompletions: readonly string[];
  generation?: string;
  missionTime?: number;
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

const remember = (ids: Set<string>, id: string): void => {
  if (ids.has(id)) return;
  if (ids.size >= DEMO_REPLAY_LIMIT) ids.delete(ids.values().next().value!);
  ids.add(id);
};
const finishEventId = (completionId: string) => `${completionId}:finish:end`;
export const newDemoGeneration = () => globalThis.crypto?.randomUUID?.() ??
  `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createWave3LocalDemo(options: {
  now?: () => number;
  applyEquipment?: (itemId: string, accountId: string) => boolean;
} = {}) {
  const now = options.now ?? Date.now;
  const listeners = new Set<(value: ExperienceSnapshot) => void>();
  let accountId = 'guest', demoPoints = DEMO_START_POINTS, equippedPreview: string | null = null;
  let coins = 0, diamonds = 0, firstFinishes = new Set<string>();
  let seenEvents = new Set<string>(), settled = new Set<string>(), redeemed = new Set<string>();
  let missionTime = now();
  let period = createMissionPeriodState(accountId, missionTime);
  let generation = 'legacy', session = 0;
  const scope = (): DemoOperationScope => ({ accountId, generation, session });
  const blankMissions = () => Object.fromEntries(Object.entries(GOALS).map(([id, goal]) =>
    [id, { progress: 0, goal, claimed: false, rewardDemoPoints: DEMO_MISSION_CLAIM_REWARD }]));
  let missions = blankMissions();
  const syncPeriods = () => {
    missionTime = Math.max(missionTime, now());
    const bounds = missionPeriodBounds(missionTime);
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
      mode: 'local-demo', authority: 'local', syncState: 'local-only',
      accountId, demoPoints, equippedPreview, updatedAt: now(),
      demoInventory: Object.freeze([...redeemed]),
      demoEconomy: Object.freeze({ coins, diamonds, firstFinishes: Object.freeze([...firstFinishes]) }),
      missions: Object.freeze(Object.fromEntries(Object.entries(missions).map(([id, progress]) => [id, Object.freeze({ ...progress })]))),
    });
  };
  const publish = () => { const value = snapshot(); for (const fn of listeners) fn(value); return value; };
  const result = (status: Wave3Status, value = snapshot()): ExperienceResult =>
    ({ status, deltaDemoPoints: 0, deltaDemoCoins: 0, deltaDemoDiamonds: 0, snapshot: value });
  const credit = (operationId: string, points: number, coinReward: number, diamondReward = 0): ExperienceResult => {
    const earnedPoints = Math.min(DEMO_BALANCE_LIMIT - demoPoints, points);
    const earnedCoins = Math.min(DEMO_BALANCE_LIMIT - coins, coinReward);
    const earnedDiamonds = Math.min(DEMO_BALANCE_LIMIT - diamonds, diamondReward);
    demoPoints += earnedPoints;
    coins += earnedCoins;
    diamonds += earnedDiamonds;
    return { status: 'completed', operationId, deltaDemoPoints: earnedPoints, deltaDemoCoins: earnedCoins,
      deltaDemoDiamonds: earnedDiamonds, snapshot: publish() };
  };
  const validScope = (value: { accountId?: string }) => value.accountId === undefined || value.accountId === accountId;
  const validEvent = (e: GameEvent) => e && e.schemaVersion === WAVE3_EXPERIENCE_VERSION && validId(e.eventId) &&
    validId(e.completionId) && validId(e.trackId) && validTime(e.occurredAt) &&
    ['finish', 'drift', 'combo'].includes(e.kind) && typeof e.mode === 'string' && typeof e.eligible === 'boolean' && validScope(e);
  const validCompletion = (c: RaceCompletion) => c && c.schemaVersion === WAVE3_EXPERIENCE_VERSION &&
    validId(c.completionId) && validId(c.trackId) && validTime(c.occurredAt) &&
    typeof c.mode === 'string' && typeof c.eligible === 'boolean' && validScope(c);
  const clear = () => {
    demoPoints = DEMO_START_POINTS; equippedPreview = null;
    coins = 0; diamonds = 0; firstFinishes = new Set();
    seenEvents = new Set(); settled = new Set(); redeemed = new Set();
    missionTime = now();
    period = createMissionPeriodState(accountId, missionTime);
    missions = blankMissions();
    return publish();
  };

  const applyMissionEvent = (event: GameEvent, time: number) => {
    period = reduceMissionEvent(period, event, time);
    const latest = projectMissionState(period, time);
    for (const { id } of MISSION_DEFINITIONS) missions[id].progress = latest[id].progress;
    const family = event.kind === 'finish' ? (event.mode === 'time' ? 'time' : 'race') : event.kind;
    const mission = missions[`mission-${family}`];
    if (mission) mission.progress = Math.min(mission.goal, mission.progress + 1);
  };
  const applyFinishEvents = (completion: RaceCompletion) => {
    const finishId = finishEventId(completion.completionId);
    if (seenEvents.has(finishId)) return;
    syncPeriods();
    const time = missionTime;
    const event = (kind: GameEvent['kind'], eventId: string): GameEvent => ({ ...completion, kind, eventId });
    applyMissionEvent(event('finish', finishId), time);
    // Progress is capped at the largest weekly goal for each family.
    for (const [kind, count] of [
      ['drift', completion.telemetry?.drift], ['combo', completion.telemetry?.combo],
    ] as const) {
      const goal = GOALS[`mission-${kind}:weekly`] ?? 0;
      for (let index = 0; index < Math.min(count ?? 0, goal); index++) {
        applyMissionEvent(event(kind, `${completion.completionId}:${kind}:${index}`), time);
      }
    }
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
    if ((value.generation !== undefined && !validId(value.generation)) ||
      (value.missionTime !== undefined && !validTime(value.missionTime))) return false;
    if (!Array.isArray(value.seenEvents) || !Array.isArray(value.settledCompletions) ||
      value.seenEvents.length > DEMO_REPLAY_LIMIT || value.settledCompletions.length > DEMO_REPLAY_LIMIT ||
      ![...value.seenEvents, ...value.settledCompletions].every(validId)) return false;
    return Object.entries(incoming.missions).every(([id, mission]) => {
      const goal = GOALS[id];
      return mission && mission.goal === goal && mission.rewardDemoPoints === DEMO_MISSION_CLAIM_REWARD &&
        Number.isSafeInteger(mission.progress) && mission.progress >= 0 && mission.progress <= goal &&
        typeof mission.claimed === 'boolean' && (!mission.claimed || mission.progress === goal);
    });
  };

  const port = {
    getCheckpoint: (): Wave3DemoCheckpoint => ({
      snapshot: snapshot(), seenEvents: [...seenEvents], settledCompletions: [...settled],
      generation, missionTime,
    }),
    restoreCheckpoint(value: Wave3DemoCheckpoint) {
      if (!validCheckpoint(value)) return null;
      const incoming = value.snapshot;
      generation = value.generation ?? 'legacy';
      missionTime = value.missionTime ?? incoming.updatedAt;
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
      period = { ...createMissionPeriodState(accountId, missionTime),
        counts: Object.fromEntries(MISSION_DEFINITIONS.map(({ id }) => [id, missions[id].progress])),
        seenEventIds: [...seenEvents] };
      return publish();
    },
    getSnapshot: snapshot,
    getOperationScope: scope,
    subscribe(listener: (value: ExperienceSnapshot) => void) { listeners.add(listener); return () => listeners.delete(listener); },
    setAccount(id: string | null) {
      const next = typeof id === 'string' && VALID_ACCOUNT.test(id) ? id : 'guest';
      if (next !== accountId) {
        accountId = next;
        generation = 'legacy';
        session++;
        return clear();
      }
      return snapshot();
    },
    expireCheckpoint(nextGeneration: string) {
      generation = nextGeneration;
      return clear();
    },
    resetDemo() {
      generation = newDemoGeneration();
      session++;
      return clear();
    },
    recordGameEvent(event: GameEvent) {
      if (!validEvent(event)) return result('invalid');
      if (!event.eligible || !DEMO_ELIGIBLE_MODES.has(event.mode)) return result('ineligible');
      const eventId = event.kind === 'finish' ? finishEventId(event.completionId) : event.eventId;
      if (seenEvents.has(event.eventId) ||
        (event.kind === 'finish' && settled.has(event.completionId))) return result('duplicate');
      syncPeriods();
      remember(seenEvents, event.eventId);
      if (validId(eventId)) remember(seenEvents, eventId);
      applyMissionEvent(event, missionTime);
      return result('completed', publish());
    },
    settleCompletion(completion: RaceCompletion) {
      if (!validCompletion(completion)) return result('invalid');
      if (!completion.eligible || !DEMO_ELIGIBLE_MODES.has(completion.mode)) return result('ineligible');
      if (completion.scope && (!sameDemoScope(completion.scope, scope()) ||
        completion.occurredAt < now() - DEMO_RETENTION_MS)) return result('expired');
      if (settled.has(completion.completionId)) return result('duplicate');
      applyFinishEvents(completion);
      const points = demoRaceReward(completion.demoRace);
      remember(settled, completion.completionId);
      const first = firstFinishes.size < 128 && !firstFinishes.has(completion.trackId) &&
        canAwardFirstFinish(completion.trackId);
      if (first) firstFinishes.add(completion.trackId);
      return credit(completion.completionId, points, 2 * points + (first ? 30 : 0));
    },
    claimMission(missionId: string, expectedPeriod?: number, expectedScope?: DemoOperationScope) {
      const time = now();
      syncPeriods();
      const currentPeriod = missionPeriodId(missionId, time);
      if ((expectedScope && !sameDemoScope(expectedScope, scope())) ||
        currentPeriod !== missionPeriodId(missionId, missionTime) ||
        (expectedPeriod !== undefined && currentPeriod !== expectedPeriod)) return result('expired');
      const mission = Object.hasOwn(missions, missionId) ? missions[missionId] : null;
      if (!mission) return result('invalid');
      if (mission.claimed) return result('duplicate');
      if (mission.progress < mission.goal) return result('ineligible');
      mission.claimed = true;
      const bonus = demoMissionBonus(missionId);
      return credit(`${missionId}:${currentPeriod}`, mission.rewardDemoPoints, bonus.coins, bonus.diamonds);
    },
    redeemPreview(itemId: string, quote?: DemoRedemptionQuote): ExperienceResult {
      const offer = demoOffer(itemId);
      if (!offer) return result('invalid');
      const time = now();
      if (quote && (!sameDemoScope(quote.scope, scope()) || !validTime(quote.expiresAt) ||
        time >= quote.expiresAt || quote.expiresAt - time > DEMO_QUOTE_LIFETIME_MS ||
        quote.catalogVersion !== WAVE3_CATALOG_VERSION || quote.currency !== offer.currency ||
        quote.cost !== offer.cost)) return result('expired');
      if (redeemed.has(itemId)) return result('duplicate');
      const { currency, cost } = offer;
      const balance = currency === 'points' ? demoPoints : currency === 'coins' ? coins : diamonds;
      if (balance < cost) return result(insufficientDemo(currency));
      if (currency === 'points') demoPoints -= cost;
      if (currency === 'coins') coins -= cost;
      if (currency === 'diamonds') diamonds -= cost;
      redeemed.add(itemId);
      return { status: 'completed', operationId: itemId, snapshot: publish(), deltaDemoPoints: currency === 'points' ? -cost : 0,
        deltaDemoCoins: currency === 'coins' ? -cost : 0, deltaDemoDiamonds: currency === 'diamonds' ? -cost : 0 };
    },
    clearEquippedPreview(itemId: string) {
      if (equippedPreview !== itemId) return result('duplicate');
      equippedPreview = null;
      return result('completed', publish());
    },
    equipPreview(itemId: string, expectedScope?: DemoOperationScope) {
      if (expectedScope && !sameDemoScope(expectedScope, scope())) return result('expired');
      if (!redeemed.has(itemId)) return result('ineligible');
      if (options.applyEquipment && !options.applyEquipment(itemId, accountId)) return result('unavailable');
      if (equippedPreview === itemId) return result('duplicate');
      equippedPreview = itemId;
      return result('completed', publish());
    },
  } satisfies Wave3ExperiencePort & Record<string, unknown>;
  return port;
}
