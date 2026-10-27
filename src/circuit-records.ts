import { circuitLaps } from './circuit-track.ts';
import { MODE_BESTS_KEY, MODE_MAX_SECONDS } from './history-policy.ts';
import { readStored, type HistoryStorage } from './history-storage.ts';
import type { LapTime } from './circuit-laps.ts';
export function validCircuitTimes(config: unknown, total: unknown, times: unknown): times is LapTime[] {
  const laps = circuitLaps(config);
  if (!laps || typeof total !== 'number' || !Number.isFinite(total) || total <= 0 || !Array.isArray(times) || times.length !== laps) return false;
  let sum = 0;
  for (const lap of times) {
    if (!lap || typeof lap.time !== 'number' || !Number.isFinite(lap.time) || lap.time <= 0 || !Array.isArray(lap.splits) || lap.splits.length !== 4) return false;
    let previous = 0;
    for (const split of lap.splits) {
      if (typeof split !== 'number' || !Number.isFinite(split) || split <= previous || split > lap.time + 1e-6) return false;
      previous = split;
    }
    if (Math.abs(previous - lap.time) > 1e-6) return false;
    sum += lap.time;
  }
  return Math.abs(sum - total) <= 1e-6;
}
export function validCircuitRecord(run: Record<string, unknown>): boolean {
  try {
    const config: unknown = JSON.parse(run.rules as string);
    return run.lapCount === circuitLaps(config) && validCircuitTimes(config, run.time, run.lapTimes);
  } catch { return false; }
}

export const circuitLapKey = (config: unknown): string => JSON.stringify(['harbor-circuit', config, 'lap']);
export function loadCircuitLapBest(config: unknown, storage?: HistoryStorage): number | null {
  if (!circuitLaps(config)) return null;
  const stored = readStored(MODE_BESTS_KEY, storage);
  const value = stored && typeof stored === 'object' && !Array.isArray(stored) ? (stored as Record<string, unknown>)[circuitLapKey(config)] : null;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MODE_MAX_SECONDS ? value : null;
}
