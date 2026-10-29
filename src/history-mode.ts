import { RACE_TRACKS } from './game.js';
import { stuntMedal } from './stunt-attack.ts';
import { HISTORY_LIMIT } from './history-policy.ts';
import { readStored as read, writeStored as write, type HistoryStorage } from './history-storage.ts';

export const MODE_HISTORY_KEY = 'skyline-rush-mode-history-v1';
export const STUNT_BESTS_KEY = 'skyline-rush-stunt-bests-v1';
export const MODE_BESTS_KEY = 'skyline-rush-mode-bests-v1';
const MODE_TYPES: ReadonlySet<string> = new Set(['custom', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'elimination', 'eventlab']);
const MODE_MAX_SECONDS = 7 * 24 * 60 * 60;
const MODE_MAX_RULES_LENGTH = 4096;
const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const valid = (time: unknown): time is number =>
  typeof time === 'number' && Number.isFinite(time) && time > 0;
const numberFinite = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);

export interface ModeHistoryRun {
  mode: string; track: string; rules: string; time: number;
  score?: number; position?: number; maxCombo?: number; airTime?: number;
  [key: string]: unknown;
}
export interface ModeConfig {
  mode?: string; duration?: number; cupTracks?: readonly unknown[];
  stages?: number; rulesVersion?: number;
  [key: string]: unknown;
}
interface ModeRaceResult {
  time: number; success?: boolean; position?: number; score?: number;
  distance?: number; itemUses?: number; maxCombo?: number; airTime?: number;
}
interface ModeRace {
  mode: string; trackId: string; config?: ModeConfig; result?: ModeRaceResult;
  length?: number; hazards?: ReadonlyArray<{ hit?: boolean; passed?: boolean }>;
}
export const validModeHistoryRun = (raw: unknown): raw is ModeHistoryRun => {
  const run = asRecord(raw);
  return typeof run.mode === 'string' && MODE_TYPES.has(run.mode) &&
    typeof run.track === 'string' && Object.hasOwn(RACE_TRACKS, run.track) &&
    typeof run.rules === 'string' && run.rules.length > 0 && run.rules.length <= MODE_MAX_RULES_LENGTH &&
    valid(run.time) && run.time <= MODE_MAX_SECONDS &&
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
  numberFinite(value) && (mode === 'stunt' ? value >= 0 : value > 0 && value <= MODE_MAX_SECONDS);
export function loadModeBest(trackId: string, config: ModeConfig | undefined, storage?: HistoryStorage): number | null {
  const mode = config?.mode;
  if (!Object.hasOwn(RACE_TRACKS, trackId) || typeof mode !== 'string' || !MODE_TYPES.has(mode)) return null;
  const signature = JSON.stringify(config);
  const values = loadModeHistory(storage)
    .filter(run => run.track === trackId && run.rules === signature)
    .map(run => mode === 'stunt' ? run.score : run.time)
    .filter((value): value is number => validModeBest(value, mode));
  const saved = asRecord(read(MODE_BESTS_KEY, storage))[modeBestId(trackId, config)];
  if (validModeBest(saved, mode)) values.push(saved);
  // Prior Stunt scores had a separate permanent store, kept as a fallback.
  if (mode === 'stunt') {
    const older = loadStuntBest(trackId, config, storage);
    if (older && validModeBest(older.score, mode)) values.push(older.score);
  }
  return !values.length ? null : mode === 'stunt' ? Math.max(...values) : Math.min(...values);
}
export function recordModeRace(race: ModeRace, storage?: HistoryStorage, now = new Date()) {
  const result = race.result;
  if (!MODE_TYPES.has(race.mode) || !Object.hasOwn(RACE_TRACKS, race.trackId) ||
      !result || !valid(result.time) || result.time > MODE_MAX_SECONDS ||
      result.success === false ||
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
  const preservedBest = loadModeBest(race.trackId, race.config, storage);
  const previousBest = scoreAttack
    ? Math.max(preservedBest ?? -Infinity, ...comparable.filter(run => numberFinite(run.score)).map(run => run.score!))
    : Math.min(preservedBest ?? Infinity, ...comparable.map(run => run.time));
  const value = scoreAttack ? result.score! : result.time;
  const record = scoreAttack ? value > previousBest : value < previousBest;
  const best = scoreAttack ? Math.max(previousBest, value) : Math.min(previousBest, value);
  const nonnegativeInt = (n: unknown): number =>
    numberFinite(n) && Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 1000000) : 0;
  const hazards = Array.isArray(race.hazards) ? race.hazards : [];
  const distance = numberFinite(result.distance) && result.distance >= 0
    ? Math.min(result.distance, 100000)
    : numberFinite(race.length) ? Math.max(0, race.length) : 0;
  const stageCount = race.mode === 'cup' ? race.config?.cupTracks?.length ?? 3 : race.config?.stages ?? 1;
  write(MODE_HISTORY_KEY, [...previous, {
    date: now.toISOString(), mode: race.mode, track: race.trackId, rules,
    modeId: race.mode, trackId: race.trackId, rulesVersion: race.config?.rulesVersion ?? 1,
    rulesSignature: rules, distance, stageCount, lapCount: null,
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
  const retained: Record<string, unknown> = Object.fromEntries(entries.filter(([key]) => key !== id).slice(-199));
  retained[id] = best;
  write(MODE_BESTS_KEY, retained, storage);
  return { best, record };
}
