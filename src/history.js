export const HISTORY_KEY = 'skyline-rush-history';
export const BEST_KEY = 'skyline-rush-best-tracks';
export const LEGACY_BEST_KEY = 'skyline-rush-best'; // single pre-tracks best; read-only here, still written by main.js for coast
export const HISTORY_LIMIT = 50;

// Storage is resolved inside each try: a blocked-storage localStorage getter throws SecurityError.
const read = (key, storage) => { try { return JSON.parse((storage ?? globalThis.localStorage).getItem(key)); } catch { return null; } };
const write = (key, value, storage) => { try { (storage ?? globalThis.localStorage).setItem(key, JSON.stringify(value)); } catch { /* History is a nicety; racing never depends on it. */ } };
const valid = time => Number.isFinite(time) && time > 0;

export function loadHistory(storage) {
  const history = read(HISTORY_KEY, storage);
  return Array.isArray(history) ? history.filter(record => record && typeof record === 'object') : [];
}

export function recordRace(race, storage, now = new Date()) {
  const result = race.result;
  const record = {
    date: now.toISOString(), track: race.trackId ?? 'coast',
    position: result.position || 0, time: result.time || 0, collisions: result.collisions || 0, nearMisses: result.nearMisses || 0,
    rings: result.rings || 0, perfectLines: result.perfectLines || 0, nitroUses: result.nitroUses || 0,
    longestCombo: result.longestCombo || 0, score: result.score || 0,
    distance: race.length || 0, // a finished race always covered its full length
  };
  write(HISTORY_KEY, [...loadHistory(storage), record].slice(-HISTORY_LIMIT), storage);
  return record;
}

// Per-track bests; folds the legacy single best into coast (min, so re-running never overwrites a better time).
export function loadBests(storage) {
  const stored = read(BEST_KEY, storage);
  const bests = {};
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) for (const track in stored) if (valid(stored[track])) bests[track] = stored[track];
  let legacy = null;
  try { legacy = Number((storage ?? globalThis.localStorage).getItem(LEGACY_BEST_KEY)); } catch { /* No legacy value to migrate. */ }
  if (valid(legacy) && !(bests.coast <= legacy)) {
    bests.coast = legacy;
    write(BEST_KEY, bests, storage);
  }
  return bests;
}

export function recordBest(trackId, time, storage) {
  const bests = loadBests(storage);
  const record = valid(time) && !(bests[trackId] <= time);
  if (record) write(BEST_KEY, { ...bests, [trackId]: time }, storage);
  return { best: record ? time : bests[trackId], record };
}

export function careerStats(history) {
  const stats = { races: 0, wins: 0, totalDistance: 0, longestCombo: 0, mostRings: 0 };
  for (const run of Array.isArray(history) ? history : []) {
    stats.races++;
    if (run.position === 1) stats.wins++;
    stats.totalDistance += run.distance || 0;
    stats.longestCombo = Math.max(stats.longestCombo, run.longestCombo || 0);
    stats.mostRings = Math.max(stats.mostRings, run.rings || 0);
  }
  return stats;
}
