import { RACE_TRACKS, DAILY_MODIFIERS } from './game.js';
import { HISTORY_KEY, BEST_KEY, UNLOCKED_KEY, MEDALS_KEY, STARS_KEY, MODE_HISTORY_KEY, DAILY_KEY,
  HISTORY_LIMIT, MEDALS, loadUnlocks, loadStars, loadBests, loadMedals, loadHistory, loadModeHistory, loadDaily } from './history.js';

export function mergeUnlocks(local, remote) {
  const unlocked = new Set(['coast', ...(Array.isArray(local) ? local : []), ...(Array.isArray(remote) ? remote : [])]);
  return Object.keys(RACE_TRACKS).filter(id => unlocked.has(id));
}

const validTime = value => Number.isFinite(value) && value > 0;
const nonnegative = value => Number.isFinite(value) && value >= 0 ? value : 0;
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const track = id => Object.hasOwn(RACE_TRACKS, id);
const raceFields = ['collisions', 'nearMisses', 'rings', 'perfectLines', 'nitroUses', 'longestCombo', 'score', 'fuelOuts', 'gapFalls', 'distance'];
const modeNames = ['custom', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'elimination'];

function raceRun(run) {
  const when = date(run?.date);
  if (!when || !track(run.track) || !validTime(run.time) || !Number.isInteger(run.position) || run.position < 1 || run.position > 4) return null;
  return { date: when, track: run.track, position: run.position, time: run.time,
    ...Object.fromEntries(raceFields.map(field => [field, nonnegative(run[field])])) };
}

function modeRun(run) {
  const when = date(run?.date);
  if (!when || !track(run.track) || !modeNames.includes(run.mode) || !validTime(run.time) ||
      typeof run.rules !== 'string' || run.rules.length > 2000) return null;
  return { date: when, mode: run.mode, track: run.track, rules: run.rules, time: run.time,
    position: Number.isInteger(run.position) ? run.position : 0, score: nonnegative(run.score),
    ...(run.mode === 'stunt' ? { maxCombo: nonnegative(run.maxCombo), airTime: nonnegative(run.airTime),
      medal: typeof run.medal === 'string' ? run.medal.slice(0, 32) : '' } : {}) };
}

function dailyRun(run) {
  const when = date(run?.date);
  if (!when || !/^\d{4}-\d{2}-\d{2}$/.test(run.id) || !track(run.track) || !DAILY_MODIFIERS.includes(run.modifier) ||
      !validTime(run.time) || !Number.isInteger(run.position) || run.position < 1 || run.position > 4) return null;
  return { id: run.id, track: run.track, modifier: run.modifier, time: run.time,
    position: run.position, score: nonnegative(run.score), date: when };
}

// Identity deliberately excludes mutable score/telemetry; the same attempt must not double-count on two devices.
const classicRunId = run => JSON.stringify([run.date, run.track, run.position, run.time]);
const modeRunId = run => JSON.stringify([run.date, run.mode, run.track, run.rules, run.time]);
const dailyRunId = run => JSON.stringify([run.id, run.date, run.track, run.modifier, run.position, run.time]);
function mergeRuns(local, cloud, normalize, identity) {
  const unique = new Map();
  for (const raw of [...(Array.isArray(local) ? local : []), ...(Array.isArray(cloud) ? cloud : [])]) {
    const run = normalize(raw);
    if (run) unique.set(identity(run), run);
  }
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date) || JSON.stringify(a).localeCompare(JSON.stringify(b))).slice(-HISTORY_LIMIT);
}

export function mergeProgress(local = {}, cloud = null) {
  if (cloud && ![1, 2].includes(cloud.version)) throw new Error('Unsupported cloud save');
  const stars = {}, bests = {}, medals = {};
  for (const id of Object.keys(RACE_TRACKS)) {
    const star = Math.max(local.stars?.[id] ?? 0, cloud?.stars?.[id] ?? 0);
    if (Number.isInteger(star) && star >= 1 && star <= 3) stars[id] = star;
    const best = Math.min(validTime(local.bests?.[id]) ? local.bests[id] : Infinity,
      validTime(cloud?.bests?.[id]) ? cloud.bests[id] : Infinity);
    if (Number.isFinite(best)) bests[id] = best;
  }
  for (const id of MEDALS) {
    const earliest = [date(local.medals?.[id]), date(cloud?.medals?.[id])].filter(Boolean).sort()[0];
    if (earliest) medals[id] = earliest;
  }
  return {
    version: 2,
    unlocked: mergeUnlocks(local.unlocked, cloud?.unlocked), stars, bests, medals,
    history: mergeRuns(local.history, cloud?.history, raceRun, classicRunId),
    modeHistory: mergeRuns(local.modeHistory, cloud?.modeHistory, modeRun, modeRunId),
    daily: mergeRuns(local.daily, cloud?.daily, dailyRun, dailyRunId),
  };
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
    for (const [key, value] of fields) target.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

const CLOUD_OWNER_KEY = 'skyline-rush-cloud-owner';
const accountKey = uid => 'skyline-rush-cloud-account:' + uid;

// Keep saved results separate for every Google identity; device preferences are never touched.
export function switchCloudAccount(previousUid, nextUid, storage = globalThis.localStorage) {
  if (typeof nextUid !== 'string' || !nextUid || (previousUid && typeof previousUid !== 'string')) return false;
  if (previousUid === nextUid) return true;
  try {
    const current = readLocalProgress(storage);
    const stored = storage.getItem(accountKey(nextUid));
    const next = stored ? mergeProgress({}, JSON.parse(stored)) : mergeProgress({});
    // Prepare the destination snapshot before changing the active owner.
    if (previousUid) storage.setItem(accountKey(previousUid), JSON.stringify(current));
    storage.setItem(accountKey(nextUid), JSON.stringify(next));
    if (!saveLocalProgress(next, storage)) return false;
    storage.setItem(CLOUD_OWNER_KEY, nextUid);
    return true;
  } catch { return false; }
}

const cloudSyncKey = uid => 'skyline-rush-cloud-sync:' + uid;
const validCloudUser = uid => typeof uid === 'string' && uid.length > 0 && uid.length <= 128;
const EMPTY_SYNC = Object.freeze({ pending: false, lastSuccess: null });

// Success means Firestore answered successfully, never merely a successful localStorage write.
export function readCloudSyncStatus(uid, storage) {
  if (!validCloudUser(uid)) return { ...EMPTY_SYNC };
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage).getItem(cloudSyncKey(uid)));
    return { pending: saved?.pending === true, lastSuccess: date(saved?.lastSuccess) };
  } catch { return { ...EMPTY_SYNC }; }
}

export function writeCloudSyncStatus(uid, patch, storage) {
  if (!validCloudUser(uid) || typeof patch?.pending !== 'boolean' ||
      (patch.lastSuccess !== undefined && !date(patch.lastSuccess))) return false;
  try {
    const target = storage ?? globalThis.localStorage;
    const previous = readCloudSyncStatus(uid, target);
    target.setItem(cloudSyncKey(uid), JSON.stringify({
      pending: patch.pending,
      lastSuccess: patch.lastSuccess === undefined ? previous.lastSuccess : date(patch.lastSuccess),
    }));
    return true;
  } catch { return false; }
}
