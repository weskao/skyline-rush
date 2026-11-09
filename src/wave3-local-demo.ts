import { WAVE3_CATALOG_VERSION, WAVE3_EXPERIENCE_VERSION } from './wave3-experience-contract.ts';
import type { ExperienceSnapshot, ExperienceResult, Wave3ExperiencePort, GameEvent, RaceCompletion, Wave3Status } from './wave3-experience-contract.ts';
import { DEMO_ELIGIBLE_MODES, DEMO_MISSION_CLAIM_REWARD, DEMO_REDEMPTION_COSTS, DEMO_START_POINTS, demoRedemption, demoSettlement } from './wave3-demo-settlement.ts';

export type Wave3DemoCheckpoint = Readonly<{
  snapshot: ExperienceSnapshot;
  seenEvents: readonly string[];
  settledCompletions: readonly string[];
}>;
const GOALS: Readonly<Record<string, number>> = Object.freeze({
  'mission-race': 1, 'mission-time': 1, 'mission-drift': 2, 'mission-combo': 1,
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
  let seenEvents = new Set<string>(), settled = new Set<string>(), redeemed = new Set<string>();
  let missions = Object.fromEntries(Object.entries(GOALS).map(([id, goal]) => [id, { progress: 0, goal, claimed: false, rewardDemoPoints: DEMO_MISSION_CLAIM_REWARD }]));
  const snapshot = (): ExperienceSnapshot => Object.freeze({
    version: WAVE3_EXPERIENCE_VERSION, catalogVersion: WAVE3_CATALOG_VERSION,
    mode: 'local-demo' as const, authority: 'local' as const, syncState: 'local-only' as const,
    accountId, demoPoints, equippedPreview, updatedAt: now(),
    demoInventory: Object.freeze([...redeemed]),
    missions: Object.freeze(Object.fromEntries(Object.entries(missions).map(([id, progress]) => [id, Object.freeze({ ...progress })]))),
  });
  const publish = () => { const value = snapshot(); for (const fn of listeners) fn(value); return value; };
  const result = (status: Wave3Status, deltaDemoPoints = 0): ExperienceResult => ({ status, deltaDemoPoints, snapshot: snapshot() });
  const validScope = (value: { accountId?: string }) => value.accountId === undefined || value.accountId === accountId;
  const validEvent = (e: GameEvent) => e && e.schemaVersion === WAVE3_EXPERIENCE_VERSION && validId(e.eventId) &&
    validId(e.completionId) && validId(e.trackId) && validTime(e.occurredAt) &&
    ['finish', 'drift', 'combo'].includes(e.kind) && typeof e.mode === 'string' && typeof e.eligible === 'boolean' && validScope(e);
  const validCompletion = (c: RaceCompletion) => c && c.schemaVersion === WAVE3_EXPERIENCE_VERSION &&
    validId(c.completionId) && validId(c.trackId) && validTime(c.occurredAt) &&
    typeof c.mode === 'string' && typeof c.eligible === 'boolean' && validScope(c);
  const reset = () => {
    demoPoints = DEMO_START_POINTS; equippedPreview = null;
    seenEvents = new Set(); settled = new Set(); redeemed = new Set();
    missions = Object.fromEntries(Object.entries(GOALS).map(([id, goal]) => [id, { progress: 0, goal, claimed: false, rewardDemoPoints: DEMO_MISSION_CLAIM_REWARD }]));
    return publish();
  };

  const validCheckpoint = (value: Wave3DemoCheckpoint) => {
    const incoming = value?.snapshot;
    if (!incoming || incoming.mode !== 'local-demo' || incoming.authority !== 'local' ||
      incoming.syncState !== 'local-only' || incoming.accountId !== accountId ||
      incoming.version !== WAVE3_EXPERIENCE_VERSION || incoming.catalogVersion !== WAVE3_CATALOG_VERSION ||
      !Number.isSafeInteger(incoming.demoPoints) || incoming.demoPoints < 0 || incoming.demoPoints > 1_000_000_000 ||
      !Array.isArray(incoming.demoInventory) || incoming.demoInventory.length > 256 ||
      !incoming.demoInventory.every(id => Object.hasOwn(DEMO_REDEMPTION_COSTS, id)) ||
      new Set(incoming.demoInventory).size !== incoming.demoInventory.length ||
      (incoming.equippedPreview !== null && !incoming.demoInventory.includes(incoming.equippedPreview)) ||
      !incoming.missions || Object.keys(incoming.missions).sort().join('|') !== Object.keys(GOALS).sort().join('|')) return false;
    if (!Array.isArray(value.seenEvents) || !Array.isArray(value.settledCompletions) ||
      value.seenEvents.length > 1024 || value.settledCompletions.length > 1024 ||
      ![...value.seenEvents, ...value.settledCompletions].every(validId)) return false;
    return Object.entries(GOALS).every(([id, goal]) => {
      const mission = incoming.missions[id];
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
      redeemed = new Set(incoming.demoInventory);
      equippedPreview = incoming.equippedPreview;
      seenEvents = new Set(value.seenEvents);
      settled = new Set(value.settledCompletions);
      missions = Object.fromEntries(Object.entries(incoming.missions).map(([id, progress]) => [id, { ...progress }]));
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
      seenEvents.add(event.eventId);
      const id = event.kind === 'finish' ? (event.mode === 'time' ? 'mission-time' : 'mission-race') : `mission-${event.kind}`;
      const mission = missions[id];
      if (mission) mission.progress = Math.min(mission.goal, mission.progress + 1);
      publish();
      return result('completed');
    },
    settleCompletion(completion) {
      if (!validCompletion(completion)) return result('invalid');
      if (!completion.eligible || !DEMO_ELIGIBLE_MODES.has(completion.mode)) return result('ineligible');
      const attempt = demoSettlement(demoPoints, completion.completionId, settled);
      if (attempt.status === 'completed') { demoPoints = attempt.credits; publish(); }
      return result(attempt.status, attempt.delta);
    },
    claimMission(missionId) {
      const mission = Object.hasOwn(missions, missionId) ? missions[missionId] : null;
      if (!mission) return result('invalid');
      if (mission.claimed) return result('duplicate');
      if (mission.progress < mission.goal) return result('ineligible');
      mission.claimed = true; demoPoints += mission.rewardDemoPoints; publish();
      return result('completed', mission.rewardDemoPoints);
    },
    redeemPreview(itemId) {
      const attempt = demoRedemption(demoPoints, itemId, redeemed);
      if (attempt.status === 'completed') { demoPoints = attempt.credits; publish(); }
      return result(attempt.status, attempt.delta);
    },
    equipPreview(itemId) {
      if (!redeemed.has(itemId)) return result('ineligible');
      if (equippedPreview === itemId) return result('duplicate');
      equippedPreview = itemId; publish(); return result('completed');
    },
  };
}
