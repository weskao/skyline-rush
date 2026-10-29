import { RACE_TRACKS } from './game.js';
import { HISTORY_LIMIT } from './history-policy.ts';
import { readStored as read, writeStored as write, type HistoryStorage } from './history-storage.ts';

export const HISTORY_KEY = 'skyline-rush-history';
export const UNLOCKED_KEY = 'skyline-rush-unlocked';

export interface ClassicRun {
  date: string; track: string; position: number; time: number;
  collisions: number; nearMisses: number; rings: number; perfectLines: number;
  nitroUses: number; longestCombo: number; score: number; fuelOuts: number;
  gapFalls: number; distance: number;
}
type ClassicResult = Partial<Omit<ClassicRun, 'date' | 'track' | 'distance'>>;
export interface CompletedClassicRace {
  trackId?: string;
  length?: number;
  result: ClassicResult;
}
const valid = (time: unknown): time is number =>
  typeof time === 'number' && Number.isFinite(time) && time > 0;

export function loadHistory(storage?: HistoryStorage): ClassicRun[] {
  const history = read(HISTORY_KEY, storage);
  // Keep pre-telemetry Classic records readable without altering their saved shape.
  return (Array.isArray(history) ? history.filter(record => record && typeof record === 'object') : []) as ClassicRun[];
}
export function loadUnlocks(storage?: HistoryStorage, history: readonly ClassicRun[] = loadHistory(storage)): string[] {
  const tracks = Object.keys(RACE_TRACKS);
  const saved = read(UNLOCKED_KEY, storage);
  const unlocked = new Set<string>(Array.isArray(saved) ? saved.filter((id: unknown): id is string =>
    typeof id === 'string' && tracks.includes(id)) : []);
  unlocked.add('coast');
  for (const run of history) {
    const index = tracks.indexOf(run.track);
    if (index < 0 || !Number.isInteger(run.position) || run.position < 1 || run.position > 3 || !valid(run.time)) continue;
    for (const id of tracks.slice(0, index + 2)) unlocked.add(id);
  }
  return tracks.filter(id => unlocked.has(id));
}
export function recordRace(race: CompletedClassicRace, storage?: HistoryStorage, now = new Date()): ClassicRun {
  const result = race.result;
  const record: ClassicRun = {
    date: now.toISOString(), track: race.trackId ?? 'coast',
    position: result.position || 0, time: result.time || 0,
    collisions: result.collisions || 0, nearMisses: result.nearMisses || 0,
    rings: result.rings || 0, perfectLines: result.perfectLines || 0,
    nitroUses: result.nitroUses || 0, longestCombo: result.longestCombo || 0,
    score: result.score || 0, fuelOuts: result.fuelOuts || 0,
    gapFalls: result.gapFalls || 0, distance: race.length || 0,
  };
  const history = [...loadHistory(storage), record];
  // Persist unlocks before trimming records which originally earned them.
  write(UNLOCKED_KEY, loadUnlocks(storage, history), storage);
  write(HISTORY_KEY, history.slice(-HISTORY_LIMIT), storage);
  return record;
}
