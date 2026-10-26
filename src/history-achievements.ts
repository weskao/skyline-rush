import { RACE_TRACKS } from './game.js';
import { validStars } from './history-stats.ts';
import { readStored as read, writeStored as write, type HistoryStorage } from './history-storage.ts';

export const BEST_KEY = 'skyline-rush-best-tracks';
export const LEGACY_BEST_KEY = 'skyline-rush-best';
export const MEDALS = ['first-win', 'clean-run', 'perfect-five', 'nitro-chain'] as const;
export const MEDALS_KEY = 'skyline-rush-medals';
export const STARS_KEY = 'skyline-rush-stars';
const PAINT_KEY = 'skyline-rush-paint';
const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
const validTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

// Store the old one-track best under the Classic coast track without downgrading better results.
export function loadBests(storage?: HistoryStorage): Record<string, number> {
  const stored = asRecord(read(BEST_KEY, storage));
  const bests: Record<string, number> = {};
  for (const track in stored) if (validTime(stored[track])) bests[track] = stored[track];
  let legacy: number | null = null;
  try { legacy = Number((storage ?? globalThis.localStorage).getItem(LEGACY_BEST_KEY)); }
  catch { /* No legacy best to migrate. */ }
  if (validTime(legacy) && !(bests.coast <= legacy)) {
    bests.coast = legacy;
    write(BEST_KEY, bests, storage);
  }
  return bests;
}
export function recordBest(trackId: string, time: number, storage?: HistoryStorage) {
  const bests = loadBests(storage);
  const record = validTime(time) && !(bests[trackId] <= time);
  if (record) write(BEST_KEY, { ...bests, [trackId]: time }, storage);
  return { best: record ? time : bests[trackId], record };
}

interface MedalResult {
  position: number;
  collisions: number;
  perfectLines: number;
  nitroChain: number;
}
type MedalId = (typeof MEDALS)[number];
const MEDAL_RULES: Record<MedalId, (result: MedalResult) => boolean> = {
  'first-win': result => result.position === 1,
  'clean-run': result => result.collisions === 0,
  'perfect-five': result => result.perfectLines >= 5,
  'nitro-chain': result => result.nitroChain >= 3,
};
export const medalsFor = (result: MedalResult | null | undefined): MedalId[] =>
  result ? MEDALS.filter(id => MEDAL_RULES[id](result)) : [];

export function loadMedals(storage?: HistoryStorage): Record<string, string> {
  const saved = asRecord(read(MEDALS_KEY, storage));
  const medals: Record<string, string> = {};
  for (const id of MEDALS) {
    const value = saved[id];
    if (typeof value === 'string' && Number.isFinite(Date.parse(value))) medals[id] = value;
  }
  return medals;
}
export function recordMedals(result: MedalResult | null | undefined, storage?: HistoryStorage, now = new Date()): MedalId[] {
  const medals = loadMedals(storage);
  const awarded = medalsFor(result).filter(id => !medals[id]);
  if (awarded.length) write(MEDALS_KEY, {
    ...medals, ...Object.fromEntries(awarded.map(id => [id, now.toISOString()])),
  }, storage);
  return awarded;
}

export function loadStars(storage?: HistoryStorage): Record<string, number> {
  const saved = asRecord(read(STARS_KEY, storage));
  const stars: Record<string, number> = {};
  for (const id in RACE_TRACKS) if (validStars(saved[id])) stars[id] = saved[id];
  return stars;
}
export function recordStars(trackId: string, stars: unknown, storage?: HistoryStorage): void {
  const saved = loadStars(storage);
  if (Object.hasOwn(RACE_TRACKS, trackId) && validStars(stars) && !(saved[trackId] >= stars))
    write(STARS_KEY, { ...saved, [trackId]: stars }, storage);
}
export const loadPaint = (owned: readonly string[], storage?: HistoryStorage): string => {
  const id = read(PAINT_KEY, storage);
  return typeof id === 'string' && owned.includes(id) ? id : 'pearl';
};
export const savePaint = (id: string, storage?: HistoryStorage): void => write(PAINT_KEY, id, storage);
