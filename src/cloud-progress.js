import { mergeProgress } from './cloud-progress-merge.ts';
import { mergeModeBests } from './cloud-mode-bests.ts';
import { HISTORY_KEY, BEST_KEY, LEGACY_BEST_KEY, UNLOCKED_KEY, MEDALS_KEY, STARS_KEY, MODE_HISTORY_KEY, DAILY_KEY,
  MODE_BESTS_KEY, STUNT_BESTS_KEY, loadUnlocks, loadStars, loadBests, loadMedals, loadHistory, loadModeHistory, loadDaily } from './history.js';

// The cloud schema/merge algorithm has one strict typed implementation.
export { mergeUnlocks, claimCloudOwner, cloudFailureStatus, mergeProgress } from './cloud-progress-merge.ts';

// Stable public export; one typed implementation owns best-score normalization.
export { mergeModeBests } from './cloud-mode-bests.ts';

export function readLocalModeBests(storage) {
  const target = storage ?? globalThis.localStorage;
  const read = key => { try { return JSON.parse(target.getItem(key)) ?? {}; } catch { return {}; } };
  return { bests: read(MODE_BESTS_KEY), stunts: read(STUNT_BESTS_KEY) };
}

export function saveLocalModeBests(value, storage) {
  const target = storage ?? globalThis.localStorage;
  try {
    const merged = mergeModeBests(value);
    const previous = [[MODE_BESTS_KEY, target.getItem(MODE_BESTS_KEY)],
      [STUNT_BESTS_KEY, target.getItem(STUNT_BESTS_KEY)]];
    try {
      target.setItem(MODE_BESTS_KEY, JSON.stringify(merged.bests));
      target.setItem(STUNT_BESTS_KEY, JSON.stringify(merged.stunts));
      return true;
    } catch {
      for (const [key, old] of previous) {
        try { if (old === null) target.removeItem(key); else target.setItem(key, old); } catch { /* best effort */ }
      }
      return false;
    }
  } catch { return false; }
}

// Import validates the complete export before any device or cloud state is mutated.
export function parseProgressExport(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > 1024 * 1024)
    throw new Error('Backup file is too large');
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error('Invalid backup JSON'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || ![1, 2].includes(raw.version))
    throw new Error('Unsupported backup version');
  return { progress: mergeProgress({}, raw), permanent: mergeModeBests(raw.permanent ?? {}) };
}

export function readLocalProgress(storage) {
  return { version: 2, unlocked: loadUnlocks(storage), stars: loadStars(storage), bests: loadBests(storage),
    medals: loadMedals(storage), history: loadHistory(storage), modeHistory: loadModeHistory(storage), daily: loadDaily(storage) };
}

export function saveLocalProgress(progress, storage) {
  const fields = [[UNLOCKED_KEY, progress.unlocked], [STARS_KEY, progress.stars], [BEST_KEY, progress.bests],
    [MEDALS_KEY, progress.medals], [HISTORY_KEY, progress.history], [MODE_HISTORY_KEY, progress.modeHistory], [DAILY_KEY, progress.daily]];
  try {
    const target = storage ?? globalThis.localStorage;
    const previous = fields.map(([key]) => [key, target.getItem(key)]);
    try {
      for (const [key, value] of fields) target.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      for (const [key, old] of previous) {
        try { if (old === null) target.removeItem(key); else target.setItem(key, old); } catch { /* Quota / permissions still blocked. */ }
      }
      return false;
    }
  } catch { return false; }
}

const CLOUD_OWNER_KEY = 'skyline-rush-cloud-owner';
const accountKey = uid => 'skyline-rush-cloud-account:' + uid;

// Keep saved results separate for every Google identity; device preferences are never touched.
export function switchCloudAccount(previousUid, nextUid, storage = globalThis.localStorage) {
  if (typeof nextUid !== 'string' || !nextUid || (previousUid && typeof previousUid !== 'string')) return false;
  if (previousUid === nextUid) return true;
  try {
    const current = { ...readLocalProgress(storage), permanent: readLocalModeBests(storage) };
    const stored = storage.getItem(accountKey(nextUid));
    const rawNext = stored ? JSON.parse(stored) : null;
    const next = rawNext ? mergeProgress({}, rawNext) : mergeProgress({});
    const permanent = mergeModeBests(rawNext?.permanent);
    // Snapshot the original account before touching active keys. Failed transitions restore it.
    if (previousUid) storage.setItem(accountKey(previousUid), JSON.stringify(current));
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

// Compatibility exports: the runtime and existing persistence API stay unchanged.
export { readCloudSyncStatus, writeCloudSyncStatus } from './cloud-sync-status.ts';

// Clear only race progress; retain device controls and preferences.
export function clearLocalProgress(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    for (const key of [UNLOCKED_KEY, STARS_KEY, BEST_KEY, MEDALS_KEY, HISTORY_KEY, MODE_HISTORY_KEY, DAILY_KEY, LEGACY_BEST_KEY, MODE_BESTS_KEY, STUNT_BESTS_KEY]) target.removeItem(key);
    return true;
  } catch { return false; }
}
