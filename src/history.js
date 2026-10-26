import { RACE_TRACKS } from './game.js';
import { stuntMedal } from './stunt-attack.ts';
import { readStored as read, writeStored as write } from './history-storage.ts';
export { validStars, starTotal, dailyBoard, careerStats } from './history-stats.ts';
export { loadGhost, saveGhost, loadModeGhost, saveModeGhost } from './history-ghost.ts';
export { DAILY_KEY, validDaily, loadDaily, recordDaily } from './history-daily.ts';
export { BEST_KEY, LEGACY_BEST_KEY, loadBests, recordBest, MEDALS, MEDALS_KEY, medalsFor, loadMedals, recordMedals, STARS_KEY, loadStars, recordStars, loadPaint, savePaint } from './history-achievements.ts';

export const HISTORY_KEY = 'skyline-rush-history';
export const UNLOCKED_KEY = 'skyline-rush-unlocked';
import { HISTORY_LIMIT } from './history-policy.ts';
export { HISTORY_LIMIT } from './history-policy.ts';

const valid = time => Number.isFinite(time) && time > 0;

export function loadUnlocks(storage, history = loadHistory(storage)) {
  const tracks = Object.keys(RACE_TRACKS);
  const saved = read(UNLOCKED_KEY, storage);
  const unlocked = new Set(Array.isArray(saved) ? saved.filter(id => tracks.includes(id)) : []);
  unlocked.add('coast');
  for (const run of history) {
    const index = tracks.indexOf(run.track);
    if (index < 0 || !Number.isInteger(run.position) || run.position < 1 || run.position > 3 || !valid(run.time)) continue;
    for (const id of tracks.slice(0, index + 2)) unlocked.add(id);
  }
  return tracks.filter(id => unlocked.has(id));
}

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
    fuelOuts: result.fuelOuts || 0, gapFalls: result.gapFalls || 0, // flight-charge tuning data
    distance: race.length || 0, // a finished race always covered its full length
  };
  const history = [...loadHistory(storage), record];
  // Preserve legacy progress before trimming away the run that originally earned it.
  write(UNLOCKED_KEY, loadUnlocks(storage, history), storage);
  write(HISTORY_KEY, history.slice(-HISTORY_LIMIT), storage);
  return record;
}


// Practice, custom and Time Attack records never mutate Classic history or unlocks.
export const MODE_HISTORY_KEY = 'skyline-rush-mode-history-v1';
const MODE_TYPES = new Set(['custom', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'elimination']);
const MODE_MAX_SECONDS = 7 * 24 * 60 * 60; // reasonable saved-run ceiling; protect rendering and comparisons
const MODE_MAX_RULES_LENGTH = 4096;
const validModeRun = run => run && typeof run === 'object' && !Array.isArray(run) &&
  MODE_TYPES.has(run.mode) && Object.hasOwn(RACE_TRACKS, run.track) &&
  typeof run.rules === 'string' && run.rules.length > 0 && run.rules.length <= MODE_MAX_RULES_LENGTH &&
  valid(run.time) && run.time <= MODE_MAX_SECONDS &&
  (run.score === undefined || (Number.isFinite(run.score) && run.score >= 0)) &&
  (run.position === undefined || (Number.isInteger(run.position) && run.position >= 0 && run.position <= 4));
export const validModeHistoryRun = validModeRun;

export function loadModeHistory(storage) {
  const saved = read(MODE_HISTORY_KEY, storage);
  // Keep legacy v1 records readable: never require new additive rulesVersion/ID/telemetry fields.
  return Array.isArray(saved) ? saved.filter(validModeRun).slice(-HISTORY_LIMIT) : [];
}
// Keep stunt peaks beyond the 50-run history limit without mixing tracks or rulesets.
export const STUNT_BESTS_KEY = 'skyline-rush-stunt-bests-v1';
export function loadStuntBest(trackId, config, storage) {
  const id = JSON.stringify([trackId, config]);
  const all = read(STUNT_BESTS_KEY, storage);
  const saved = all && typeof all === 'object' && !Array.isArray(all) ? all[id] : null;
  const validPeak = value => value && Number.isFinite(value.score) && value.score >= 0 &&
    Number.isInteger(value.maxCombo) && value.maxCombo >= 0 &&
    Number.isFinite(value.airTime) && value.airTime >= 0;
  const older = loadModeHistory(storage).filter(run =>
    run.mode === 'stunt' && run.track === trackId && run.rules === JSON.stringify(config) &&
    Number.isFinite(run.score) && run.score >= 0
  ).map(run => ({
    score: run.score,
    maxCombo: Number.isInteger(run.maxCombo) && run.maxCombo >= 0 ? run.maxCombo : 0,
    airTime: Number.isFinite(run.airTime) && run.airTime >= 0 ? run.airTime : 0,
  }));
  const records = [...older, ...(validPeak(saved) ? [saved] : [])];
  if (!records.length) return null;
  const score = Math.max(...records.map(record => record.score));
  return {
    score,
    maxCombo: Math.max(...records.map(record => record.maxCombo)),
    airTime: Math.max(...records.map(record => record.airTime)),
    medal: stuntMedal(score, config?.duration),
  };
}

// Rule-scoped bests survive the 50-run list rollover. Old v1 history remains the fallback.
export const MODE_BESTS_KEY = 'skyline-rush-mode-bests-v1';
const modeBestId = (trackId, config) => JSON.stringify([trackId, config]);
const validModeBest = (value, mode) => Number.isFinite(value) &&
  (mode === 'stunt' ? value >= 0 : value > 0 && value <= MODE_MAX_SECONDS);
export function loadModeBest(trackId, config, storage) {
  if (!Object.hasOwn(RACE_TRACKS, trackId) || !MODE_TYPES.has(config?.mode)) return null;
  const signature = JSON.stringify(config);
  const mode = config.mode;
  const values = loadModeHistory(storage)
    .filter(run => run.track === trackId && run.rules === signature)
    .map(run => mode === 'stunt' ? run.score : run.time)
    .filter(value => validModeBest(value, mode));
  const stored = read(MODE_BESTS_KEY, storage);
  const saved = stored && typeof stored === 'object' && !Array.isArray(stored)
    ? stored[modeBestId(trackId, config)] : undefined;
  if (validModeBest(saved, mode)) values.push(saved);
  // Stunt had a separate permanent best store before MODE_BESTS_KEY existed.
  if (mode === 'stunt') {
    const older = loadStuntBest(trackId, config, storage);
    if (older && validModeBest(older.score, mode)) values.push(older.score);
  }
  return !values.length ? null : mode === 'stunt' ? Math.max(...values) : Math.min(...values);
}

export function recordModeRace(race, storage, now = new Date()) {
  if (!MODE_TYPES.has(race.mode) || !Object.hasOwn(RACE_TRACKS, race.trackId) ||
      !race.result || !valid(race.result.time) || race.result.time > MODE_MAX_SECONDS ||
      race.result.success === false ||
      (race.result.position !== undefined && (!Number.isInteger(race.result.position) ||
        race.result.position < 1 || race.result.position > 4)) ||
      (race.result.score !== undefined && (!Number.isFinite(race.result.score) || race.result.score < 0)) ||
      (race.mode === 'stunt' && !Number.isFinite(race.result.score)))
    throw new TypeError('A finished practice race with valid result and track is required');
  const rules = JSON.stringify(race.config);
  if (typeof rules !== 'string' || !rules.length || rules.length > MODE_MAX_RULES_LENGTH)
    throw new TypeError('Invalid practice race rules');
  const previous = loadModeHistory(storage);
  const comparable = previous.filter(run => run.track === race.trackId && run.rules === rules);
  const scoreAttack = race.mode === 'stunt';
  const preservedBest = loadModeBest(race.trackId, race.config, storage);
  const previousBest = scoreAttack ? Math.max(preservedBest ?? -Infinity, ...comparable.filter(run => Number.isFinite(run.score)).map(run => run.score))
    : Math.min(preservedBest ?? Infinity, ...comparable.map(run => run.time));
  const value = scoreAttack ? race.result.score : race.result.time;
  const record = scoreAttack ? value > previousBest : value < previousBest;
  const best = scoreAttack ? Math.max(previousBest, value) : Math.min(previousBest, value);
  const nonnegativeInt = n => Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 1000000) : 0;
  const hazards = Array.isArray(race.hazards) ? race.hazards : [];
  const distance = Number.isFinite(race.result.distance) && race.result.distance >= 0
    ? Math.min(race.result.distance, 100000) : Number.isFinite(race.length) ? Math.max(0, race.length) : 0;
  const stageCount = race.mode === 'cup' ? race.config?.cupTracks?.length ?? 3 : race.config?.stages ?? 1;
  write(MODE_HISTORY_KEY, [...previous, {
    date: now.toISOString(), mode: race.mode, track: race.trackId, rules,
    // Additive identity/telemetry: the v1 mode history key and best comparisons stay compatible.
    modeId: race.mode, trackId: race.trackId, rulesVersion: race.config?.rulesVersion ?? 1,
    rulesSignature: rules, distance, stageCount, lapCount: null,
    itemsUsed: nonnegativeInt(race.result.itemUses),
    hazardPasses: hazards.filter(h => h.passed).length,
    hazardHits: hazards.filter(h => h.hit).length,
    time: race.result.time, position: race.result.position, score: race.result.score,
    ...(scoreAttack ? {
      maxCombo: Number.isInteger(race.result.maxCombo) ? Math.max(0, race.result.maxCombo) : 0,
      airTime: Number.isFinite(race.result.airTime) ? Math.max(0, race.result.airTime) : 0,
      medal: stuntMedal(race.result.score, race.config?.duration),
    } : {}),
  }].slice(-HISTORY_LIMIT), storage);
  if (scoreAttack) {
    const id = JSON.stringify([race.trackId, race.config]);
    const stored = read(STUNT_BESTS_KEY, storage);
    const entries = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    const peak = loadStuntBest(race.trackId, race.config, storage);
    write(STUNT_BESTS_KEY, { ...entries, [id]: peak }, storage);
  }
  const id = modeBestId(race.trackId, race.config);
  const stored = read(MODE_BESTS_KEY, storage);
  const entries = stored && typeof stored === 'object' && !Array.isArray(stored)
    ? Object.entries(stored).filter(([, value]) => Number.isFinite(value) && value >= 0) : [];
  // Keep the newest 200 rule variants, without losing this session's lifetime best.
  const retained = Object.fromEntries(entries.filter(([key]) => key !== id).slice(-199));
  retained[id] = best;
  write(MODE_BESTS_KEY, retained, storage);
  return { best, record };
}

