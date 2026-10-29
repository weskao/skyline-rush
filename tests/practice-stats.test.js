import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPracticeStats, samplePractice } from '../src/practice-stats.ts';

test('tracks travelled meters, peak speed and moving airborne time', () => {
  const stats = createPracticeStats();
  samplePractice(stats, { speed: 40, altitude: 5, nearMisses: 0 }, 4, 0.1);
  samplePractice(stats, { speed: 30, altitude: 0, nearMisses: 0 }, 3, 0.1);
  assert.equal(stats.travelled, 7);
  assert.equal(stats.maxSpeed, 40);
  assert.equal(stats.airTime, 0.1);
});
test('gap respawn does not inflate travel distance or max speed', () => {
  const stats = createPracticeStats();
  samplePractice(stats, { speed: 30, altitude: 0, nearMisses: 0 }, 1000, 0.1);
  assert.equal(stats.travelled, 3);
  samplePractice(stats, { speed: 0, altitude: 10, nearMisses: 0 }, -5, 0.1);
  assert.equal(stats.travelled, 3);
  assert.equal(stats.airTime, 0);
});
test('only completed trick payout events increment the trick counter once', () => {
  const stats = createPracticeStats();
  const car = { speed: 50, altitude: 1, nearMisses: 3, trickPayout: {time: 4} };
  samplePractice(stats, car, 1, 0.02);
  samplePractice(stats, car, 1, 0.02);
  assert.equal(stats.tricks, 1);
  assert.equal(stats.nearMisses, 3);
  car.trickPayout = {time: 5};
  samplePractice(stats, car, 1, 0.02);
  assert.equal(stats.tricks, 2);
});
test('invalid frame times do not mutate the counters', () => {
  const stats = createPracticeStats();
  samplePractice(stats, { speed: 70, altitude: 6, nearMisses: 2 }, 5, NaN);
  assert.equal(stats.travelled, 0);
  assert.equal(stats.maxSpeed, 0);
});
