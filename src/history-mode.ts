import { isModeTrack } from './race-tracks.ts';
import { circuitLaps } from './circuit-track.ts';
import { validCircuitTimes, validCircuitRecord, circuitLapKey } from './circuit-records.ts';
import { stuntMedal } from './stunt-attack.ts';
import { HISTORY_LIMIT, MODE_BESTS_KEY, MODE_MAX_SECONDS } from './history-policy.ts';
import { readStored as read, writeStored as write, type HistoryStorage } from './history-storage.ts';

export const MODE_HISTORY_KEY = 'skyline-rush-mode-history-v1';
export const STUNT_BESTS_KEY = 'skyline-rush-stunt-bests-v1';
export { MODE_BESTS_KEY } from './history-policy.ts';
const MODE_TYPES: ReadonlySet<string> = new Set(['custom', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'elimination', 'eventlab', 'endless', 'circuit']);
const MODE_MAX_RULES_LENGTH = 4096;
const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const valid = (time: unknown): time is number =>
  typeof time === 'number' && Number.isFinite(time) && time > 0;
const numberFinite = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);

export interface ModeHistoryRun {
  mode: string; track: string; rules: string; time: number;
  distance?: number; score?: number; position?: number; maxCombo?: number; airTime?: number;
  [key: string]: unknown;
}
export interface ModeConfig {
  mode?: string; duration?: number; cupTracks?: readonly unknown[];
  stages?: number; rulesVersion?: number;
  [key: string]: unknown;
}
interface ModeRaceResult {
  time: number; success?: boolean; position?: number; score?: number;
  lapTimes?: import('./circuit-laps.ts').LapTime[]; distance?: number; itemUses?: number; maxCombo?: number; airTime?: number;
}
interface ModeRace {
  mode: string; trackId: string; config?: ModeConfig; result?: ModeRaceResult;
  length?: number; hazards?: ReadonlyArray<{ hit?: boolean; passed?: boolean }>;
}
export const validModeHistoryRun = (raw: unknown): raw is ModeHistoryRun => {
  const run = asRecord(raw);
  return typeof run.mode === 'string' && MODE_TYPES.has(run.mode) &&
    isModeTrack(run.track, run.mode) &&
    typeof run.rules === 'string' && run.rules.length > 0 && run.rules.length <= MODE_MAX_RULES_LENGTH &&
    valid(run.time) && run.time <= (run.mode === 'endless' ? Number.MAX_SAFE_INTEGER : MODE_MAX_SECONDS) &&
    (run.mode !== 'endless' || run.track === 'coast' && numberFinite(run.distance) && run.distance >= 0 && run.distance <= Number.MAX_SAFE_INTEGER) &&
    (run.mode !== 'circuit' || validCircuitRecord(run)) &&
    (run.score === undefined || (numberFinite(run.score) && run.score >= 0)) &&
    (run.position === undefined || (numberFinite(run.position) && Number.isInteger(run.position) &&
      run.position >= 0 && run.position <= 4));
};
export function loadModeHistory(storage?: HistoryStorage): ModeHistoryRun[] {
  const saved = read(MODE_HISTORY_KEY, storage);
  // Continue accepting v1 data lacking additive rulesVersion/ID/telemetry fields.
  return Array.isArray(saved) ? saved.filter(validModeHistoryRun).slice(-HISTORY_LIMIT) : [];
}
interface StuntPeak { score: number; maxCombo: number; airTime: number }
const validPeak = (raw: unknown): raw is StuntPeak => {
  const peak = asRecord(raw);
  return numberFinite(peak.score) && peak.score >= 0 &&
    numberFinite(peak.maxCombo) && Number.isInteger(peak.maxCombo) && peak.maxCombo >= 0 &&
    numberFinite(peak.airTime) && peak.airTime >= 0;
};
export function loadStuntBest(trackId: string, config: ModeConfig | undefined, storage?: HistoryStorage) {
  const id = JSON.stringify([trackId, config]);
  const saved = asRecord(read(STUNT_BESTS_KEY, storage))[id];
  const older: StuntPeak[] = loadModeHistory(storage).filter(run =>
    run.mode === 'stunt' && run.track === trackId && run.rules === JSON.stringify(config) &&
    numberFinite(run.score) && run.score >= 0
  ).map(run => ({
    score: run.score!,
    maxCombo: numberFinite(run.maxCombo) && Number.isInteger(run.maxCombo) && run.maxCombo >= 0 ? run.maxCombo : 0,
    airTime: numberFinite(run.airTime) && run.airTime >= 0 ? run.airTime : 0,
  }));
  const records: StuntPeak[] = [...older, ...(validPeak(saved) ? [saved] : [])];
  if (!records.length) return null;
  const score = Math.max(...records.map(record => record.score));
  return {
    score,
    maxCombo: Math.max(...records.map(record => record.maxCombo)),
    airTime: Math.max(...records.map(record => record.airTime)),
    medal: stuntMedal(score, config?.duration),
  };
}
const modeBestId = (trackId: string, config: ModeConfig | undefined): string =>
  JSON.stringify([trackId, config]);
const validModeBest = (value: unknown, mode: string): value is number =>
  numberFinite(value) && (mode === 'stunt' ? value >= 0 : value > 0 && value <= (mode === 'endless' ? Number.MAX_SAFE_INTEGER : MODE_MAX_SECONDS));
export function loadModeBest(trackId: string, config: ModeConfig | undefined, storage?: HistoryStorage): number | null {
  const mode = config?.mode;
  if (!isModeTrack(trackId, mode) || typeof mode !== 'string' || !MODE_TYPES.has(mode) || mode === 'circuit' && !circuitLaps(config)) return null;
  const signature = JSON.stringify(config);
  const values = loadModeHistory(storage)
    .filter(run => run.track === trackId && run.rules === signature)
    .map(run => mode === 'endless' ? run.distance : mode === 'stunt' ? run.score : run.time)
    .filter((value): value is number => validModeBest(value, mode));
  const saved = asRecord(read(MODE_BESTS_KEY, storage))[modeBestId(trackId, config)];
  if (validModeBest(saved, mode)) values.push(saved);
  // Prior Stunt scores had a separate permanent store, kept as a fallback.
  if (mode === 'stunt') {
    const older = loadStuntBest(trackId, config, storage);
    if (older && validModeBest(older.score, mode)) values.push(older.score);
  }
  return !values.length ? null : ['stunt', 'endless'].includes(mode) ? Math.max(...values) : Math.min(...values);
}
export function recordModeRace(race: ModeRace, storage?: HistoryStorage, now = new Date()) {
  const result = race.result;
  if (!MODE_TYPES.has(race.mode) || !isModeTrack(race.trackId, race.mode) ||
      !result || !valid(result.time) || result.time > (race.mode === 'endless' ? Number.MAX_SAFE_INTEGER : MODE_MAX_SECONDS) ||
      (race.mode === 'endless' && (race.trackId !== 'coast' || !valid(result.distance) || result.distance > Number.MAX_SAFE_INTEGER)) ||
      result.success === false ||
      race.mode === 'circuit' && !validCircuitTimes(race.config, result.time, result.lapTimes) ||
      (result.position !== undefined && (!Number.isInteger(result.position) ||
        result.position < 1 || result.position > 4)) ||
      (result.score !== undefined && (!numberFinite(result.score) || result.score < 0)) ||
      (race.mode === 'stunt' && !numberFinite(result.score)))
    throw new TypeError('A finished practice race with valid result and track is required');
  const rules = JSON.stringify(race.config);
  if (typeof rules !== 'string' || !rules.length || rules.length > MODE_MAX_RULES_LENGTH)
    throw new TypeError('Invalid practice race rules');
  const previous = loadModeHistory(storage);
  const comparable = previous.filter(run => run.track === race.trackId && run.rules === rules);
  const scoreAttack = race.mode === 'stunt';
  const distanceAttack = race.mode === 'endless', maximize = scoreAttack || distanceAttack;
  const preservedBest = loadModeBest(race.trackId, race.config, storage);
  const previousBest = maximize
    ? Math.max(preservedBest ?? -Infinity, ...comparable.map(run => distanceAttack ? run.distance! : run.score!).filter(numberFinite))
    : Math.min(preservedBest ?? Infinity, ...comparable.map(run => run.time));
  const value = distanceAttack ? result.distance! : scoreAttack ? result.score! : result.time;
  const record = maximize ? value > previousBest : value < previousBest;
  const best = maximize ? Math.max(previousBest, value) : Math.min(previousBest, value);
  const nonnegativeInt = (n: unknown): number =>
    numberFinite(n) && Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 1000000) : 0;
  const hazards = Array.isArray(race.hazards) ? race.hazards : [];
  const distance = numberFinite(result.distance) && result.distance >= 0
    ? Math.min(result.distance, distanceAttack ? Number.MAX_SAFE_INTEGER : 100000)
    : numberFinite(race.length) ? Math.max(0, race.length) : 0;
  const stageCount = race.mode === 'cup' ? race.config?.cupTracks?.length ?? 3 : race.config?.stages ?? 1;
  write(MODE_HISTORY_KEY, [...previous, {
    date: now.toISOString(), mode: race.mode, track: race.trackId, rules,
    modeId: race.mode, trackId: race.trackId, rulesVersion: race.config?.rulesVersion ?? 1,
    rulesSignature: rules, distance, stageCount, lapCount: race.mode === 'circuit' ? circuitLaps(race.config) : null,
    ...(race.mode === 'circuit' ? { lapTimes: result.lapTimes } : {}),
    itemsUsed: nonnegativeInt(result.itemUses),
    hazardPasses: hazards.filter(h => h.passed).length,
    hazardHits: hazards.filter(h => h.hit).length,
    time: result.time, position: result.position, score: result.score,
    ...(scoreAttack ? {
      maxCombo: numberFinite(result.maxCombo) && Number.isInteger(result.maxCombo) ? Math.max(0, result.maxCombo) : 0,
      airTime: numberFinite(result.airTime) ? Math.max(0, result.airTime) : 0,
      medal: stuntMedal(result.score!, race.config?.duration),
    } : {}),
  }].slice(-HISTORY_LIMIT), storage);
  if (scoreAttack) {
    const id = JSON.stringify([race.trackId, race.config]);
    const entries = asRecord(read(STUNT_BESTS_KEY, storage));
    const peak = loadStuntBest(race.trackId, race.config, storage);
    write(STUNT_BESTS_KEY, { ...entries, [id]: peak }, storage);
  }
  const id = modeBestId(race.trackId, race.config);
  const stored = asRecord(read(MODE_BESTS_KEY, storage));
  const entries = Object.entries(stored).filter(([, value]) => numberFinite(value) && value >= 0);
  const lapId = race.mode === 'circuit' ? circuitLapKey(race.config) : null;
  const retained: Record<string, unknown> = Object.fromEntries(entries.filter(([key]) => key !== id && key !== lapId).slice(lapId ? -198 : -199));
  retained[id] = best;
  if (lapId) retained[lapId] = Math.min(validModeBest(stored[lapId], 'circuit') ? stored[lapId] : Infinity,
    ...result.lapTimes!.map(lap => lap.time));
  write(MODE_BESTS_KEY, retained, storage);
  return { best, record };
}
