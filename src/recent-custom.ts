import { normalizeRaceConfig } from './race-config.js';

// Recent Custom sessions are local convenience shortcuts, not Career progress.
// Storage is an injectable boundary for tests and privacy-restricted browsers.
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
type RaceConfig = ReturnType<typeof normalizeRaceConfig>;
export interface RecentCustomEntry { trackId: string; config: RaceConfig }

const KEY = 'skyline-rush-recent-custom-v1';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const validTrack = (id: unknown): id is string =>
  typeof id === 'string' && /^[a-z][a-z-]{1,24}$/.test(id);
const normalized = (config: unknown): RaceConfig | null =>
  isRecord(config) && config.mode === 'custom' ? normalizeRaceConfig(config) : null;

export function loadRecentCustom(storage?: StorageLike): RecentCustomEntry[] {
  try {
    const raw = storage?.getItem(KEY) ?? globalThis.localStorage?.getItem(KEY) ?? 'null';
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter((entry: unknown): entry is RecentCustomEntry =>
      isRecord(entry) && validTrack(entry.trackId) && normalized(entry.config) !== null).slice(0, 3) : [];
  } catch { return []; }
}

export function saveRecentCustom(storage: StorageLike | undefined, trackId: unknown, config: unknown): RecentCustomEntry[] {
  const entries = loadRecentCustom(storage);
  if (!validTrack(trackId)) return entries;
  const accepted = normalized(config);
  if (!accepted) return entries;
  // Normalize only once; keep the persisted shape and stable deduplication signature.
  const item: RecentCustomEntry = { trackId, config: accepted };
  const signature = JSON.stringify(item);
  const next = [item, ...entries.filter(entry => JSON.stringify(entry) !== signature)].slice(0, 3);
  try { (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(next)); } catch { /* Racing never requires storage. */ }
  return next;
}
