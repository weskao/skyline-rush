// Multi-heat point-to-point racing. Stages are never circuit laps.
interface SprintStage { time: number; position: number; score: number }
export interface SprintSeries { count: number; results: SprintStage[] }
interface FinishedSprint {
  phase: string;
  result?: { time?: number; position?: number; score?: number } | null;
}

export const SPRINT_STAGE_COUNTS = Object.freeze([1, 2, 3, 5]);

export function createSprintSeries(count: number = 1): SprintSeries {
  if (!SPRINT_STAGE_COUNTS.includes(count)) throw new RangeError('Unsupported sprint stage count');
  return { count, results: [] };
}

export function addSprintStage(series: SprintSeries, race: FinishedSprint | null | undefined): SprintSeries {
  const result = race?.result;
  const time = result?.time;
  const position = result?.position;
  const score = result?.score ?? 0;
  if (race?.phase !== 'finished' || series.results.length >= series.count ||
    typeof time !== 'number' || !Number.isFinite(time) || time <= 0 ||
    typeof position !== 'number' || !Number.isInteger(position) || position < 1 || position > 4 ||
    !Number.isFinite(score)) throw new RangeError('Invalid finished sprint stage');
  return { count: series.count, results: [...series.results, { time, position, score }] };
}

export const sprintTotal = (series: SprintSeries): number => series.results.reduce((time, run) => time + run.time, 0);
