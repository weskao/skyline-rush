import { RACE_TRACKS, DAILY_MODIFIERS } from './game.js';
import { HISTORY_LIMIT } from './history-policy.ts';
import { readStored as read, writeStored as write, type HistoryStorage } from './history-storage.ts';

export const DAILY_KEY = 'skyline-rush-daily';
export interface DailyRun {
  id: string;
  track: string;
  modifier: string;
  time: number;
  position: number;
  score: number;
  date: string;
}
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function validDaily(raw: unknown): raw is DailyRun {
  const run = asRecord(raw);
  return typeof run.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(run.id) &&
    typeof run.track === 'string' && Object.hasOwn(RACE_TRACKS, run.track) &&
    typeof run.modifier === 'string' && DAILY_MODIFIERS.includes(run.modifier) &&
    typeof run.time === 'number' && Number.isFinite(run.time) && run.time > 0 &&
    typeof run.position === 'number' && Number.isInteger(run.position) && run.position >= 1 && run.position <= 4 &&
    typeof run.score === 'number' && Number.isFinite(run.score) && run.score >= 0 &&
    typeof run.date === 'string';
}
export function loadDaily(storage?: HistoryStorage): DailyRun[] {
  const runs = read(DAILY_KEY, storage);
  return Array.isArray(runs) ? runs.filter(validDaily) : [];
}
export function recordDaily(
  challenge: { id: string; track: string; modifier: string },
  race: { result: { position: number; time: number; score: number } },
  storage?: HistoryStorage, now = new Date(),
): DailyRun {
  const { position, time, score } = race.result;
  const run = { id: challenge.id, track: challenge.track, modifier: challenge.modifier,
    time, position, score, date: now.toISOString() };
  write(DAILY_KEY, [...loadDaily(storage), run].slice(-HISTORY_LIMIT), storage);
  return run;
}
