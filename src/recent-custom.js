import { normalizeRaceConfig } from './race-config.js';

// Recent Custom sessions are local convenience shortcuts, not Career progress.
const KEY = 'skyline-rush-recent-custom-v1';
const validTrack = id => typeof id === 'string' && /^[a-z][a-z-]{1,24}$/.test(id);
const normalized = config => config?.mode === 'custom' ? normalizeRaceConfig(config) : null;
export function loadRecentCustom(storage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) ?? globalThis.localStorage?.getItem(KEY));
    return Array.isArray(data) ? data.filter(entry => validTrack(entry?.trackId) && normalized(entry.config)).slice(0, 3) : [];
  } catch { return []; }
}
export function saveRecentCustom(storage, trackId, config) {
  const entries = loadRecentCustom(storage);
  if (!validTrack(trackId) || !normalized(config)) return entries;
  const item = { trackId, config: normalized(config) };
  const signature = JSON.stringify(item);
  const next = [item, ...entries.filter(entry => JSON.stringify(entry) !== signature)].slice(0, 3);
  try { (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(next)); } catch { /* Racing never requires storage. */ }
  return next;
}
