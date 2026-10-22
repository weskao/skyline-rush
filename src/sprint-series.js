// Multi-heat point-to-point racing. Stages are never circuit laps.
export const SPRINT_STAGE_COUNTS = Object.freeze([1, 2, 3, 5]);

export function createSprintSeries(count = 1) {
  if (!SPRINT_STAGE_COUNTS.includes(count)) throw new RangeError('Unsupported sprint stage count');
  return { count, results: [] };
}

export function addSprintStage(series, race) {
  const result = race?.result;
  if (race?.phase !== 'finished' || series.results.length >= series.count ||
    !Number.isFinite(result?.time) || result.time <= 0 ||
    !Number.isInteger(result?.position) || result.position < 1 || result.position > 4 ||
    !Number.isFinite(result?.score ?? 0)) throw new RangeError('Invalid finished sprint stage');
  return { count: series.count, results: [...series.results, { time: result.time, position: result.position, score: result.score ?? 0 }] };
}

export const sprintTotal = series => series.results.reduce((time, run) => time + run.time, 0);
