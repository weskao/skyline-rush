import { createWave3LocalDemo } from './wave3-local-demo.ts';
import { WAVE3_EXPERIENCE_VERSION } from './wave3-experience-contract.ts';
import type { Wave3ExperiencePort, GameEvent, ExperienceResult } from './wave3-experience-contract.ts';

/** Only real simulation transitions are observed. No DOM or server calls in a frame. */
type ObservedRace = {
  phase: string; trackId: string; mode: string; elapsed: number;
  player: { driftPayout: unknown; longestCombo: number };
  result: null | { success?: boolean; time?: number };
};
type RaceMemory = { completionId: string; accountId: string; lastDrift: unknown; driftCount: number; combo: number; pending: { kind: GameEvent['kind']; suffix: string }[] };
const id = (): string => globalThis.crypto?.randomUUID?.() ?? `demo-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export function createWave3RaceEventBridge(experience: Wave3ExperiencePort, idFactory: () => string = id) {
  const known = new WeakMap<object, RaceMemory>();
  const memory = (race: ObservedRace): RaceMemory => {
    let item = known.get(race);
    if (!item) {
      item = { completionId: idFactory(), accountId: experience.getSnapshot().accountId,
        lastDrift: null, driftCount: 0, combo: 0, pending: [] };
      known.set(race, item);
    }
    return item;
  };
  const emit = (race: ObservedRace, state: RaceMemory, kind: GameEvent['kind'], suffix: string) => {
    const event: GameEvent = { schemaVersion: WAVE3_EXPERIENCE_VERSION,
      eventId: `${state.completionId}:${kind}:${suffix}`, completionId: state.completionId,
      accountId: state.accountId, trackId: race.trackId, mode: race.mode,
      occurredAt: Date.now(), kind, eligible: true };
    experience.recordGameEvent(event);
  };
  return {
    capture(race: ObservedRace): void {
      if (race.phase !== 'racing' && race.phase !== 'finished') return;
      const state = memory(race);
      const player = race.player;
      if (player.driftPayout && player.driftPayout !== state.lastDrift) {
        state.lastDrift = player.driftPayout;
        state.pending.push({ kind: 'drift', suffix: String(++state.driftCount) });
      }
      if (Number.isFinite(player.longestCombo) && player.longestCombo > state.combo) {
        state.combo = player.longestCombo;
        state.pending.push({ kind: 'combo', suffix: String(state.combo) });
      }
    },
    finish(race: ObservedRace, intermediateStage: boolean): ExperienceResult | null {
      if (race.phase !== 'finished' || !race.result) return null;
      const state = memory(race);
      if (state.accountId !== experience.getSnapshot().accountId) return null;
      const eligible = !intermediateStage && race.result.success !== false &&
        typeof race.result.time === 'number' && Number.isFinite(race.result.time) && race.result.time > 0;
      if (eligible) {
        for (const { kind, suffix } of state.pending) emit(race, state, kind, suffix);
        state.pending.length = 0;
        emit(race, state, 'finish', 'end');
      }
      return experience.settleCompletion({ schemaVersion: WAVE3_EXPERIENCE_VERSION,
        completionId: state.completionId, accountId: state.accountId,
        trackId: race.trackId, mode: race.mode, occurredAt: Date.now(), eligible });
    },
  };
}

/** Shared gameplay-to-Garage adapter, never a verified wallet. */
export const wave3DemoExperience = createWave3LocalDemo();
const bridge = createWave3RaceEventBridge(wave3DemoExperience);
export const captureWave3RaceTelemetry = bridge.capture;
const receipts = new WeakMap<object, ExperienceResult | null>();
/** The first receipt is held by race identity, so rendering never settles again. */
export function settleWave3RaceDemo(race: Parameters<typeof bridge.finish>[0], intermediate: boolean): ExperienceResult | null {
  if (!receipts.has(race)) receipts.set(race, bridge.finish(race, intermediate));
  return receipts.get(race) ?? null;
}
export function getWave3DemoReceipt(race: object): ExperienceResult | null {
  const receipt = receipts.get(race);
  return receipt?.snapshot.accountId === wave3DemoExperience.getSnapshot().accountId ? receipt : null;
}
export const setWave3DemoAccount = (id: string | null): void => { wave3DemoExperience.setAccount(id); };
