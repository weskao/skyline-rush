import { RACE_DRIVER_IDS, reversedGrid } from './race-grid.ts';

// Multi-heat point-to-point racing. Stages are never circuit laps.
interface SprintStage { time: number; position: number; score: number; order?: string[] }
export interface SprintSeries { count: number; results: SprintStage[] }
interface FinishedSprint {
  phase: string;
  elapsed?: number;
  length?: number;
  rivals?: { name: string; finishTime?: number | null; distance: number; speed: number }[];
  result?: { time?: number; position?: number; score?: number } | null;
}
export const SPRINT_STAGE_COUNTS = Object.freeze([1, 2, 3, 5]);

export function createSprintSeries(count: number = 1): SprintSeries {
  if (!SPRINT_STAGE_COUNTS.includes(count)) throw new RangeError('Unsupported sprint stage count');
  return { count, results: [] };
}

export function addSprintStage(series: SprintSeries, race: FinishedSprint | null | undefined): SprintSeries {
  const result = race?.result, time = result?.time, position = result?.position, score = result?.score ?? 0;
  if (race?.phase !== 'finished' || !series || !Array.isArray(series.results) ||
    !SPRINT_STAGE_COUNTS.includes(series.count) || series.results.length >= series.count ||
    typeof time !== 'number' || !Number.isFinite(time) || time <= 0 ||
    typeof position !== 'number' || !Number.isInteger(position) || position < 1 || position > 8 ||
    !Number.isFinite(score)) throw new RangeError('Invalid finished sprint stage');
  let order: string[] | undefined;
  if (race.rivals !== undefined) {
    if (!Array.isArray(race.rivals) || race.rivals.length + 1 < position ||
      race.rivals.length > 7 || new Set(race.rivals.map(r => r.name)).size !== race.rivals.length ||
      race.rivals.some(r => !RACE_DRIVER_IDS.includes(r.name as typeof RACE_DRIVER_IDS[number]) || r.name === 'YOU'))
      throw new RangeError('Invalid sprint drivers');
    const results = [{ name: 'YOU', time }, ...race.rivals.map(r => ({
      name: r.name, time: r.finishTime && Number.isFinite(r.finishTime) && r.finishTime > 0 ? r.finishTime :
        (race.elapsed ?? time) + Math.max(0, (race.length ?? 0) - r.distance) / Math.max(1, r.speed),
    }))];
    if (results.some(r => !Number.isFinite(r.time) || r.time <= 0)) throw new RangeError('Invalid sprint times');
    order = results.sort((a, b) => a.time - b.time || a.name.localeCompare(b.name)).map(r => r.name);
  }
  return { count: series.count, results: [...series.results, { time, position, score, ...(order ? { order } : {}) }] };
}

export function nextSprintGrid(series: SprintSeries): string[] | null {
  const previous = series.results.at(-1)?.order;
  return previous && previous.length >= 2 ? reversedGrid(previous) : null;
}
export const sprintTotal = (series: SprintSeries): number => series.results.reduce((time, run) => time + run.time, 0);
