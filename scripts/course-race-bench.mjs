// Reproducible CPU-only 8-car baseline; for WebGL/frame-time evidence use the manual device matrix.
// Usage: node --experimental-strip-types --expose-gc scripts/course-race-bench.mjs
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { createRace, startRace, stepRace } from '../src/game.js';

export function percentile(values, ratio) {
  if (!values.length || ratio < 0 || ratio > 1) throw new RangeError('Invalid percentile');
  const sorted = [...values].sort((a,b) => a-b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}
export const microseconds = ms => Math.round(ms * 1000 * 100) / 100;
const INPUT = { throttle: true, boost: true };

function raceAt60(trackId) {
  globalThis.gc?.();
  const race = createRace(trackId), samples = [];
  if (race.rivals.length !== 7) throw Error(trackId + ': expected eight cars');
  startRace(race);
  while (race.phase === 'countdown') stepRace(race, {}, 1 / 60);
  const before = process.memoryUsage().heapUsed;
  let frame = 0;
  while (race.phase === 'racing' && frame < 60 * 400) {
    if (race.course) race.player.x = 0; // use the mandatory ground route, not a fake one-dimensional shortcut
    const begin = performance.now();
    stepRace(race, INPUT, 1 / 60);
    samples.push((performance.now() - begin) * 1000);
    frame++;
  }
  if (race.phase !== 'finished') throw Error(trackId + ': did not finish a real simulated race');
  const after = process.memoryUsage().heapUsed;
  return { trackId, frame, durationSeconds: race.result?.time ?? race.elapsed,
    meanUs: Math.round(samples.reduce((s, v) => s + v, 0) / samples.length * 100) / 100,
    p95Us: Math.round(percentile(samples, .95) * 100) / 100,
    heapBytesPerFrame: Math.round((after - before) / frame),
    // Browser/world samples are tracked in a separate profiler; do not invent a value here.
    sampleRouteCallsPerFrame: null,
  };
}
export function compareRaceSteps(coast, dune) {
  return { overheadP95Us: Math.round((dune.p95Us - coast.p95Us) * 100) / 100,
    meetsCpuBudget: dune.p95Us - coast.p95Us <= 300,
    samplesBudget: 'NOT VERIFIED',
    webglBudget: 'NOT VERIFIED',
    deviceBudget: 'NOT VERIFIED' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const coast = raceAt60('coast'), dune = raceAt60('dune-tempest');
  const metrics = { command: 'node --experimental-strip-types --expose-gc scripts/course-race-bench.mjs',
    node: process.version, gcEnabled: typeof globalThis.gc === 'function', coast, dune,
    comparison: compareRaceSteps(coast, dune) };
  process.stdout.write(JSON.stringify(metrics, null, 2) + '\n');
  if (!metrics.comparison.meetsCpuBudget) process.exitCode = 1;
}
