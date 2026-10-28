import { cupComplete, type CupState } from './championship-cup.ts';
import type { HistoryStorage } from './history-storage.ts';
import { writeStored } from './history-storage.ts';

export const CUP_PROGRESS_KEY = 'skyline-rush-cup-progress-v1';

export function loadCupProgress(unlocked: readonly string[], storage?: HistoryStorage): CupState | null {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(CUP_PROGRESS_KEY);
    if (!raw || raw.length > 16_384) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('cup' in data)) return null;
    const cup = data.cup as CupState;
    if (cupComplete(cup)) return null;
    if (cup.tracks.some(track => !unlocked.includes(track))) return null;
    // Standings order must agree with the saved times, including deterministic ties.
    if (cup.results.some(heat => heat.order.some((name, index, order) => index > 0 &&
      (heat.times[order[index - 1]] > heat.times[name] ||
        (heat.times[order[index - 1]] === heat.times[name] && order[index - 1].localeCompare(name) > 0))))) return null;
    return cup;
  } catch { return null; }
}

export function saveCupProgress(cup: CupState | null, storage?: HistoryStorage): void {
  writeStored(CUP_PROGRESS_KEY, cup && !cupComplete(cup) ? { version: 1, cup } : null, storage);
}

export function retryCupHeat(cup: CupState, trackId: string): CupState {
  cupComplete(cup); // Reuse the shared track/driver/time validation before rolling back.
  const last = cup.results.at(-1);
  if (last?.track === trackId) return { tracks: [...cup.tracks], results: cup.results.slice(0, -1) };
  if (cup.tracks[cup.results.length] !== trackId) throw new RangeError('Invalid Cup retry');
  return cup;
}
