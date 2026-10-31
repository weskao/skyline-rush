import { RACE_TRACKS, DAILY_MODIFIERS } from './game.js';
import { MEDALS, HISTORY_LIMIT } from './history.ts';
import { MODE_NAMES } from './cloud-mode-bests.ts';
import { isModeTrack } from './race-tracks.ts';
import { validCircuitRecord } from './circuit-records.ts';
import type { LapTime } from './circuit-laps.ts';
import { validStars } from './history-stats.ts';

type RawRecord = Record<string, unknown>;
type NormalizedRun = { date: string; [key: string]: unknown };
export interface MergedProgress {
  version: 2;
  unlocked: string[];
  stars: Record<string, number>;
  bests: Record<string, number>;
  medals: Record<string, string>;
  history: NormalizedRun[];
  modeHistory: NormalizedRun[];
  daily: NormalizedRun[];
}
const asRecord = (v: unknown): RawRecord =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as RawRecord : {};
const validTime = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;
const nonnegative = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
const validInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 1000000;
const date = (v: unknown): string | null =>
  typeof v === 'string' && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
const track = (id: unknown): id is string =>
  typeof id === 'string' && Object.hasOwn(RACE_TRACKS, id);
const raceFields = ['collisions', 'nearMisses', 'rings', 'perfectLines', 'nitroUses', 'longestCombo', 'score', 'fuelOuts', 'gapFalls', 'distance'] as const;

export function mergeUnlocks(local: unknown, remote: unknown): string[] {
  const unlocked = new Set<unknown>(['coast', ...(Array.isArray(local) ? local : []), ...(Array.isArray(remote) ? remote : [])]);
  return Object.keys(RACE_TRACKS).filter(id => unlocked.has(id));
}

export const claimCloudOwner = (owner: unknown, uid: string): string | null =>
  !owner || owner === uid ? uid : null;

export function cloudFailureStatus(error: unknown, deviceSaved: boolean): string {
  if (!deviceSaved) return 'cloud.localFailed';
  const code = asRecord(error).code;
  if (code === 'resource-exhausted') return 'cloud.quota';
  return ['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code as string)
    ? 'cloud.pending' : 'cloud.failed';
}

function raceRun(raw: unknown): NormalizedRun | null {
  const run = asRecord(raw);
  const when = date(run.date);
  const pos = run.position;
  const time = run.time;
  const id = run.track;
  if (!when || !track(id) || !validTime(time) ||
      typeof pos !== 'number' || !Number.isInteger(pos) || pos < 0 || pos > 4) return null;
  return { date: when, track: id, position: pos, time,
    ...Object.fromEntries(raceFields.map(field => [field, nonnegative(run[field])])) };
}

function modeRun(raw: unknown): NormalizedRun | null {
  const run = asRecord(raw);
  const when = date(run.date);
  const id = run.track, mode = run.mode, time = run.time, rules = run.rules;
  if (!when || !isModeTrack(id, mode) || typeof mode !== 'string' || !(MODE_NAMES as readonly string[]).includes(mode) ||
      !validTime(time) || typeof rules !== 'string' || !rules.length || rules.length > 4096) return null;
  if (mode === 'endless' && (typeof run.distance !== 'number' ||
      !Number.isFinite(run.distance) || run.distance < 0 || run.distance > Number.MAX_SAFE_INTEGER)) return null;
  if (mode === 'circuit' && !validCircuitRecord(run)) return null;
  const telemetry: RawRecord = {};
  if (mode === 'circuit') telemetry.lapTimes = (run.lapTimes as LapTime[]).map(lap => ({ time: lap.time, splits: [...lap.splits] }));
  for (const key of ['rulesVersion', 'stageCount', 'itemsUsed', 'hazardPasses', 'hazardHits']) {
    if (validInt(run[key])) telemetry[key] = run[key];
  }
  if (typeof run.distance === 'number' && Number.isFinite(run.distance) &&
      run.distance >= 0 && run.distance <= (mode === 'endless' ? Number.MAX_SAFE_INTEGER : 100000)) telemetry.distance = run.distance;
  if (run.lapCount === null) telemetry.lapCount = null;
  else if (validInt(run.lapCount)) telemetry.lapCount = run.lapCount;
  if (run.modeId === mode) telemetry.modeId = mode;
  if (run.trackId === id) telemetry.trackId = id;
  if (run.rulesSignature === rules) telemetry.rulesSignature = rules;
  return { date: when, mode, track: id, rules, time,
    position: typeof run.position === 'number' && Number.isInteger(run.position) ? run.position : 0,
    score: nonnegative(run.score), ...telemetry,
    ...(mode === 'stunt' ? { maxCombo: nonnegative(run.maxCombo), airTime: nonnegative(run.airTime),
      medal: typeof run.medal === 'string' ? run.medal.slice(0, 32) : '' } : {}) };
}

function dailyRun(raw: unknown): NormalizedRun | null {
  const run = asRecord(raw);
  const when = date(run.date);
  const id = run.id, trackId = run.track, modifier = run.modifier, time = run.time, pos = run.position;
  if (!when || typeof id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(id) ||
      !track(trackId) || typeof modifier !== 'string' || !DAILY_MODIFIERS.includes(modifier) ||
      !validTime(time) || typeof pos !== 'number' || !Number.isInteger(pos) || pos < 1 || pos > 4) return null;
  return { id, track: trackId, modifier, time, position: pos, score: nonnegative(run.score), date: when };
}

// Stable identity ignores mutable telemetry: the same attempt never counts twice on two devices.
const classicRunId = (run: NormalizedRun): string => JSON.stringify([run.date, run.track, run.position, run.time]);
const modeRunId = (run: NormalizedRun): string => JSON.stringify([run.date, run.mode, run.track, run.rules, run.time]);
const dailyRunId = (run: NormalizedRun): string => JSON.stringify([run.id, run.date, run.track, run.modifier, run.position, run.time]);
function mergeRuns(local: unknown, cloud: unknown,
  normalize: (value: unknown) => NormalizedRun | null, identity: (run: NormalizedRun) => string): NormalizedRun[] {
  const unique = new Map<string, NormalizedRun>();
  for (const raw of [...(Array.isArray(local) ? local : []), ...(Array.isArray(cloud) ? cloud : [])]) {
    const run = normalize(raw);
    if (run) unique.set(identity(run), run);
  }
  return [...unique.values()].sort((a, b) =>
    a.date.localeCompare(b.date) || JSON.stringify(a).localeCompare(JSON.stringify(b))).slice(-HISTORY_LIMIT);
}

export function mergeProgress(local: unknown = {}, cloud: unknown = null): MergedProgress {
  const localProgress = asRecord(local);
  const remote = asRecord(cloud);
  if (cloud && remote.version !== 1 && remote.version !== 2) throw new Error('Unsupported cloud save');
  const stars: Record<string, number> = {}, bests: Record<string, number> = {}, medals: Record<string, string> = {};
  const localStars = asRecord(localProgress.stars), remoteStars = asRecord(remote.stars);
  const localBests = asRecord(localProgress.bests), remoteBests = asRecord(remote.bests);
  for (const id of Object.keys(RACE_TRACKS)) {
    const localStar = localStars[id], remoteStar = remoteStars[id];
    const star = Math.max(validStars(localStar) ? localStar : 0, validStars(remoteStar) ? remoteStar : 0);
    if (star) stars[id] = star;
    const localBest = localBests[id], remoteBest = remoteBests[id];
    const best = Math.min(validTime(localBest) ? localBest : Infinity, validTime(remoteBest) ? remoteBest : Infinity);
    if (Number.isFinite(best)) bests[id] = best;
  }
  const localMedals = asRecord(localProgress.medals), remoteMedals = asRecord(remote.medals);
  for (const id of MEDALS) {
    const earliest = [date(localMedals[id]), date(remoteMedals[id])]
      .filter((value): value is string => Boolean(value)).sort()[0];
    if (earliest) medals[id] = earliest;
  }
  return {
    version: 2,
    unlocked: mergeUnlocks(localProgress.unlocked, remote.unlocked), stars, bests, medals,
    history: mergeRuns(localProgress.history, remote.history, raceRun, classicRunId),
    modeHistory: mergeRuns(localProgress.modeHistory, remote.modeHistory, modeRun, modeRunId),
    daily: mergeRuns(localProgress.daily, remote.daily, dailyRun, dailyRunId),
  };
}
