import { RACE_TRACKS, DAILY_MODIFIERS } from './game.js';
import { validGhost } from './ghost.js';
import { stuntMedal } from './stunt-attack.js';

export const HISTORY_KEY = 'skyline-rush-history';
export const BEST_KEY = 'skyline-rush-best-tracks';
export const LEGACY_BEST_KEY = 'skyline-rush-best'; // single pre-tracks best; read-only here, still written by main.js for coast
export const HISTORY_LIMIT = 50;

// Storage is resolved inside each try: a blocked-storage localStorage getter throws SecurityError.
const read = (key, storage) => { try { return JSON.parse((storage ?? globalThis.localStorage).getItem(key)); } catch { return null; } };
const write = (key, value, storage) => { try { (storage ?? globalThis.localStorage).setItem(key, JSON.stringify(value)); } catch { /* History is a nicety; racing never depends on it. */ } };
const valid = time => Number.isFinite(time) && time > 0;

export function loadUnlocks(storage, history = loadHistory(storage)) {
  const tracks = Object.keys(RACE_TRACKS);
  const saved = read('skyline-rush-unlocked', storage);
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
  write('skyline-rush-unlocked', loadUnlocks(storage, history), storage);
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
  (run.position === undefined || (Number.isInteger(run.position) && run.position >= 1 && run.position <= 4));
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
  const preservedBest = scoreAttack ? loadStuntBest(race.trackId, race.config, storage) : null;
  const previousBest = scoreAttack ? Math.max(preservedBest?.score ?? -Infinity, ...comparable.filter(run => Number.isFinite(run.score)).map(run => run.score))
    : Math.min(Infinity, ...comparable.map(run => run.time));
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
  return { best, record };
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

export const MEDALS = ['first-win', 'clean-run', 'perfect-five', 'nitro-chain'];
const MEDALS_KEY = 'skyline-rush-medals';
const MEDAL_RULES = {
  'first-win': result => result.position === 1,
  'clean-run': result => result.collisions === 0,
  'perfect-five': result => result.perfectLines >= 5,
  'nitro-chain': result => result.nitroChain >= 3, // three charges in one burst, not three separate activations
};
export const medalsFor = result => result ? MEDALS.filter(id => MEDAL_RULES[id](result)) : [];

// { medalId: ISO date first awarded }; unknown ids and bad dates are dropped.
export function loadMedals(storage) {
  const saved = read(MEDALS_KEY, storage);
  const medals = {};
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const id of MEDALS) if (typeof saved[id] === 'string' && Number.isFinite(Date.parse(saved[id]))) medals[id] = saved[id];
  }
  return medals;
}

export function recordMedals(result, storage, now = new Date()) {
  const medals = loadMedals(storage);
  const awarded = medalsFor(result).filter(id => !medals[id]);
  if (awarded.length) write(MEDALS_KEY, { ...medals, ...Object.fromEntries(awarded.map(id => [id, now.toISOString()])) }, storage);
  return awarded;
}

// Best style stars per track (1-3); their sum unlocks paints.
const STARS_KEY = 'skyline-rush-stars';
const validStars = stars => Number.isInteger(stars) && stars >= 1 && stars <= 3;
export function loadStars(storage) {
  const saved = read(STARS_KEY, storage);
  const stars = {};
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) for (const id in RACE_TRACKS) if (validStars(saved[id])) stars[id] = saved[id];
  return stars;
}
export function recordStars(trackId, stars, storage) {
  const saved = loadStars(storage);
  if (RACE_TRACKS[trackId] && validStars(stars) && !(saved[trackId] >= stars)) write(STARS_KEY, { ...saved, [trackId]: stars }, storage);
}
export const starTotal = stars => Object.values(stars).reduce((sum, value) => sum + value, 0);

const PAINT_KEY = 'skyline-rush-paint';
export const loadPaint = (owned, storage) => { const id = read(PAINT_KEY, storage); return owned.includes(id) ? id : 'pearl'; };
export const savePaint = (id, storage) => write(PAINT_KEY, id, storage);

// One best-run ghost per track: { trackId: { time, samples } }.
const GHOSTS_KEY = 'skyline-rush-ghosts';
const loadGhosts = storage => { const saved = read(GHOSTS_KEY, storage); return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}; };
export const loadGhost = (trackId, storage) => { const ghost = loadGhosts(storage)[trackId]; return validGhost(ghost, trackId) ? ghost : null; };
export const saveGhost = (trackId, ghost, storage) => write(GHOSTS_KEY, { ...loadGhosts(storage), [trackId]: ghost }, storage);


// Time Attack ghosts are keyed by full rule signature, not by Classic best.
const MODE_GHOST_KEY = 'skyline-rush-mode-ghosts-v1';
const modeGhostId = (trackId, config) => trackId + ':' + JSON.stringify(config);
export function loadModeGhost(trackId, config, storage) {
  const ghosts = read(MODE_GHOST_KEY, storage);
  const item = ghosts && typeof ghosts === 'object' && !Array.isArray(ghosts) ? ghosts[modeGhostId(trackId, config)] : null;
  return validGhost(item, trackId) ? item : null;
}
export function saveModeGhost(trackId, config, ghost, storage) {
  if (!validGhost(ghost, trackId)) return false;
  const previous = read(MODE_GHOST_KEY, storage);
  const entries = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
  write(MODE_GHOST_KEY, { ...entries, [modeGhostId(trackId, config)]: ghost }, storage);
  return true;
}

// Daily challenge runs live on their own board, never in history, bests, unlocks or ghosts.
const DAILY_KEY = 'skyline-rush-daily';
const validDaily = run => run && typeof run === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(run.id) && Object.hasOwn(RACE_TRACKS, run.track) &&
  DAILY_MODIFIERS.includes(run.modifier) && valid(run.time) && Number.isInteger(run.position) && run.position >= 1 && run.position <= 4 &&
  Number.isFinite(run.score) && run.score >= 0 && typeof run.date === 'string';
export function loadDaily(storage) {
  const runs = read(DAILY_KEY, storage);
  return Array.isArray(runs) ? runs.filter(validDaily) : [];
}
export function recordDaily(challenge, race, storage, now = new Date()) {
  const { position, time, score } = race.result;
  const run = { id: challenge.id, track: challenge.track, modifier: challenge.modifier, time, position, score, date: now.toISOString() };
  write(DAILY_KEY, [...loadDaily(storage), run].slice(-HISTORY_LIMIT), storage);
  return run;
}
export const dailyBoard = (runs, id) => runs.filter(run => run.id === id).sort((a, b) => a.time - b.time);

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
