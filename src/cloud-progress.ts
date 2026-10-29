import { mergeProgress } from './cloud-progress-merge.ts';
import { mergeModeBests } from './cloud-mode-bests.ts';
import { CUP_PROGRESS_KEY } from './cup-progress.ts';
import { HISTORY_KEY, BEST_KEY, LEGACY_BEST_KEY, UNLOCKED_KEY, MEDALS_KEY, STARS_KEY, MODE_HISTORY_KEY, DAILY_KEY,
  MODE_BESTS_KEY, STUNT_BESTS_KEY, loadUnlocks, loadStars, loadBests, loadMedals, loadHistory, loadModeHistory, loadDaily } from './history.ts';

export { mergeUnlocks, claimCloudOwner, cloudFailureStatus, mergeProgress } from './cloud-progress-merge.ts';
export { mergeModeBests } from './cloud-mode-bests.ts';
export { readCloudSyncStatus, writeCloudSyncStatus } from './cloud-sync-status.ts';

// Account-scoped game records use a minimal browser storage interface so tests can inject
// a quota-limited store without needing the DOM. Device settings live under different keys.
interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
interface ProgressValues {
  unlocked: unknown;
  stars: unknown;
  bests: unknown;
  medals: unknown;
  history: unknown;
  modeHistory: unknown;
  daily: unknown;
}
const asRecord = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};

export function readLocalModeBests(storage?: ProgressStorage) {
  const target = storage ?? globalThis.localStorage;
  const read = (key: string): unknown => {
    try { return JSON.parse(target.getItem(key) ?? 'null') ?? {}; } catch { return {}; }
  };
  return { bests: read(MODE_BESTS_KEY), stunts: read(STUNT_BESTS_KEY) };
}

export function saveLocalModeBests(value: unknown, storage?: ProgressStorage): boolean {
  const target = storage ?? globalThis.localStorage;
  try {
    const merged = mergeModeBests(value);
    const previous = [[MODE_BESTS_KEY, target.getItem(MODE_BESTS_KEY)],
      [STUNT_BESTS_KEY, target.getItem(STUNT_BESTS_KEY)]] as const;
    try {
      target.setItem(MODE_BESTS_KEY, JSON.stringify(merged.bests));
      target.setItem(STUNT_BESTS_KEY, JSON.stringify(merged.stunts));
      return true;
    } catch {
      for (const [key, old] of previous) {
        try { if (old === null) target.removeItem!(key); else target.setItem(key, old); } catch { /* best effort */ }
      }
      return false;
    }
  } catch { return false; }
}

// Reject future versions, malformed JSON and oversized exports before mutating game/device state.
export function parseProgressExport(text: unknown) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > 1024 * 1024)
    throw new Error('Backup file is too large');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('Invalid backup JSON'); }
  const record = asRecord(raw);
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw) ||
      (record.version !== 1 && record.version !== 2))
    throw new Error('Unsupported backup version');
  return { progress: mergeProgress({}, record), permanent: mergeModeBests(record.permanent ?? {}) };
}

export function readLocalProgress(storage?: ProgressStorage) {
  return { version: 2 as const, unlocked: loadUnlocks(storage), stars: loadStars(storage), bests: loadBests(storage),
    medals: loadMedals(storage), history: loadHistory(storage), modeHistory: loadModeHistory(storage), daily: loadDaily(storage) };
}

export function saveLocalProgress(progress: ProgressValues, storage?: ProgressStorage): boolean {
  const fields: Array<readonly [string, unknown]> = [
    [UNLOCKED_KEY, progress.unlocked], [STARS_KEY, progress.stars], [BEST_KEY, progress.bests],
    [MEDALS_KEY, progress.medals], [HISTORY_KEY, progress.history],
    [MODE_HISTORY_KEY, progress.modeHistory], [DAILY_KEY, progress.daily],
  ];
  try {
    const target = storage ?? globalThis.localStorage;
    const previous = fields.map(([key]) => [key, target.getItem(key)] as const);
    try {
      for (const [key, value] of fields) target.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      for (const [key, old] of previous) {
        try { if (old === null) target.removeItem!(key); else target.setItem(key, old); } catch { /* quota / permissions */ }
      }
      return false;
    }
  } catch { return false; }
}

const CLOUD_OWNER_KEY = 'skyline-rush-cloud-owner';
const accountKey = (uid: string): string => 'skyline-rush-cloud-account:' + uid;

// Snapshot previous identity before modifying active game keys; restore on any failed transition.
export function switchCloudAccount(previousUid: unknown, nextUid: unknown,
  storage: ProgressStorage = globalThis.localStorage): boolean {
  if (typeof nextUid !== 'string' || !nextUid || (previousUid && typeof previousUid !== 'string')) return false;
  if (previousUid === nextUid) return true;
  try {
    const current = { ...readLocalProgress(storage), permanent: readLocalModeBests(storage) };
    const stored = storage.getItem(accountKey(nextUid));
    const rawNext: unknown = stored ? JSON.parse(stored) : null;
    const next = rawNext ? mergeProgress({}, rawNext) : mergeProgress({});
    const permanent = mergeModeBests(asRecord(rawNext).permanent);
    if (previousUid) storage.setItem(accountKey(previousUid as string), JSON.stringify(current));
    if (!saveLocalProgress(next, storage) || !saveLocalModeBests(permanent, storage)) {
      saveLocalProgress(current, storage);
      saveLocalModeBests(current.permanent, storage);
      return false;
    }
    try {
      storage.setItem(CLOUD_OWNER_KEY, nextUid);
    } catch {
      saveLocalProgress(current, storage);
      saveLocalModeBests(current.permanent, storage);
      return false;
    }
    return true;
  } catch { return false; }
}

// Clear only game progress and historical save formats, never device control/audio preferences.
export function clearLocalProgress(storage?: ProgressStorage): boolean {
  try {
    const target = storage ?? globalThis.localStorage;
    for (const key of [UNLOCKED_KEY, STARS_KEY, BEST_KEY, MEDALS_KEY, HISTORY_KEY, MODE_HISTORY_KEY,
      DAILY_KEY, LEGACY_BEST_KEY, MODE_BESTS_KEY, STUNT_BESTS_KEY, CUP_PROGRESS_KEY]) target.removeItem!(key);
    return true;
  } catch { return false; }
}
