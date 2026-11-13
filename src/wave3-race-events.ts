import { wave3DemoExperience } from './wave3-browser-experience.ts';
export { wave3DemoExperience };
import { cupStandings } from './championship-cup.ts';
import { raceTrack } from './race-tracks.ts';
import type { RaceSeries } from './race-results.ts';
import { WAVE3_EXPERIENCE_VERSION, sameDemoScope } from './wave3-experience-contract.ts';
import type { Wave3ExperiencePort, DemoOperationScope, ExperienceResult, DemoRaceMetrics } from './wave3-experience-contract.ts';

/** Only real simulation transitions are observed. No DOM or server calls in a frame. */
type ObservedRace = {
  phase: string; trackId: string; mode: string; elapsed: number;
  length?: number; config?: { difficulty?: string }; rivals?: readonly unknown[];
  player: { driftPayout: unknown; longestCombo: number; distance?: number };
  result: null | { success?: boolean; time?: number; position?: number; endReason?: string };
};
type RaceMemory = {
  completionId: string; scope: DemoOperationScope; lastDrift: unknown;
  driftCount: number; combo: number; comboCount: number; finishedAt?: number;
};
const id = (): string => globalThis.crypto?.randomUUID?.() ?? `demo-${Math.random().toString(36).slice(2)}-${Date.now()}`;

function rewardMetrics(race: ObservedRace, series?: RaceSeries): DemoRaceMetrics | undefined {
  const length = race.length;
  if (length === undefined || !Number.isFinite(length) || length <= 0) return undefined;
  let position = race.result?.position;
  let legs = [{ trackId: race.trackId, distance: length }];
  const { cup, sprintSeries, stunt } = series ?? {};
  if (race.mode === 'cup' && cup) {
    legs = cup.results.map(heat => ({ trackId: heat.track, distance: raceTrack(heat.track)?.length ?? length }));
    position = cupStandings(cup).findIndex(driver => driver.name === 'YOU') + 1;
  } else if (race.mode === 'custom' && sprintSeries?.results.length) {
    legs[0]!.distance = length * sprintSeries.results.length;
    position = Math.round(sprintSeries.results.reduce((sum, heat) => sum + heat.position, 0) / sprintSeries.results.length);
  } else if (race.mode === 'stunt' || race.mode === 'elimination') {
    const driven = race.player.distance ?? length;
    legs[0]!.distance = driven + (race.mode === 'stunt' && stunt ? Math.max(0, stunt.heats - 1) * length : 0);
  }
  return { legs, position, difficulty: race.config?.difficulty, rivalCount: race.rivals?.length ?? 0 };
}

export function createWave3RaceEventBridge<T extends ReturnType<Wave3ExperiencePort['settleCompletion']>>(
  experience: Pick<Wave3ExperiencePort, 'getOperationScope'> & {
    settleCompletion: (completion: Parameters<Wave3ExperiencePort['settleCompletion']>[0]) => T;
  },
  idFactory: () => string = id,
  now: () => number = Date.now,
) {
  const known = new WeakMap<object, RaceMemory>();
  const memory = (race: ObservedRace): RaceMemory => {
    let item = known.get(race);
    if (!item) {
      item = { completionId: idFactory(), scope: experience.getOperationScope(),
        lastDrift: null, driftCount: 0, combo: 0, comboCount: 0 };
      known.set(race, item);
    }
    return item;
  };
  return {
    capture(race: ObservedRace): void {
      if (race.phase !== 'countdown' && race.phase !== 'racing' && race.phase !== 'finished') return;
      const state = memory(race);
      if (race.phase === 'countdown') return;
      const player = race.player;
      if (player.driftPayout && player.driftPayout !== state.lastDrift) {
        state.lastDrift = player.driftPayout;
        state.driftCount++;
      }
      if (Number.isFinite(player.longestCombo) && player.longestCombo > state.combo) {
        state.combo = player.longestCombo;
        state.comboCount++;
      }
    },
    finish(race: ObservedRace, intermediateStage: boolean, series?: RaceSeries): T | null {
      if (race.phase !== 'finished' || !race.result) return null;
      const state = memory(race);
      if (!sameDemoScope(state.scope, experience.getOperationScope())) return null;
      const eligible = !intermediateStage && race.result.success !== false &&
        typeof race.result.time === 'number' && Number.isFinite(race.result.time) && race.result.time > 0;
      state.finishedAt ??= now();
      return experience.settleCompletion({ schemaVersion: WAVE3_EXPERIENCE_VERSION,
        completionId: state.completionId, accountId: state.scope.accountId, scope: state.scope,
        trackId: race.trackId, mode: race.mode, occurredAt: state.finishedAt, eligible,
        telemetry: { drift: state.driftCount, combo: state.comboCount },
        ...(eligible ? { demoRace: rewardMetrics(race, series) } : {}) });
    },
  };
}

const bridge = createWave3RaceEventBridge(wave3DemoExperience);
export const captureWave3RaceTelemetry = bridge.capture;
type PendingReceipt = { scope: DemoOperationScope; value: Promise<ExperienceResult | null> };
const receipts = new WeakMap<object, PendingReceipt>();
/** The first receipt is held by race identity, so rendering never settles again. */
export function settleWave3RaceDemo(race: Parameters<typeof bridge.finish>[0], intermediate: boolean, series?: RaceSeries): void {
  if (receipts.has(race)) return;
  const scope = wave3DemoExperience.getOperationScope();
  receipts.set(race, { scope, value: Promise.resolve(bridge.finish(race, intermediate, series)) });
}
export async function getWave3DemoReceipt(race: object): Promise<ExperienceResult | null> {
  const receipt = receipts.get(race);
  const value = await receipt?.value;
  return receipt && sameDemoScope(receipt.scope, wave3DemoExperience.getOperationScope()) ? value ?? null : null;
}
export const setWave3DemoAccount = (id: string | null): void => { wave3DemoExperience.setAccount(id); };
