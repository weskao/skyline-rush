import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createPracticeStats, samplePractice } from '../src/practice-stats.ts';
import { createSprintSeries, addSprintStage, sprintTotal } from '../src/sprint-series.ts';

test('typed free-drive telemetry never counts respawn distance or repeats trick payouts', () => {
  const stats = createPracticeStats();
  const car = { speed: 60, altitude: 3, nearMisses: 2, trickPayout: { time: 12 } };
  samplePractice(stats, car, 10_000, .05);
  samplePractice(stats, car, -20, .05);
  assert.equal(stats.travelled, 3);
  assert.equal(stats.tricks, 1);
  assert.equal(stats.nearMisses, 2);
  assert.equal(stats.airTime, .1);
  assert.equal(existsSync(new URL('../src/practice-stats.js', import.meta.url)), false);
});

test('typed sprint series does not mutate its inputs and rejects extra stages', () => {
  const series = createSprintSeries(2);
  const first = addSprintStage(series, { phase: 'finished', result: { time: 24, position: 2 } });
  assert.deepEqual(series.results, []);
  assert.equal(sprintTotal(first), 24);
  const next = addSprintStage(first, { phase: 'finished', result: { time: 25, position: 1, score: 10 } });
  assert.equal(sprintTotal(next), 49);
  assert.throws(() => addSprintStage(next, { phase: 'finished', result: { time: 30, position: 1 } }), RangeError);
  assert.equal(existsSync(new URL('../src/sprint-series.js', import.meta.url)), false);
});
