import test from 'node:test';
import assert from 'node:assert/strict';
import { percentile, compareRaceSteps } from '../scripts/course-race-bench.mjs';

test('benchmark percentile is correctly defined for short deterministic vectors', () => {
  assert.equal(percentile([4,1,5,2,3], .95), 5);
  assert.equal(percentile([4,1,5,2,3], .5), 3);
  assert.throws(() => percentile([], .95), RangeError);
  assert.throws(() => percentile([1], 1.2), RangeError);
});
test('CPU p95 budget is exactly 0.3 ms overhead; missing measurements cannot be declared green', () => {
  assert.equal(compareRaceSteps({ p95Us: 100 }, { p95Us: 400 }).meetsCpuBudget, true);
  assert.equal(compareRaceSteps({ p95Us: 100 }, { p95Us: 401 }).meetsCpuBudget, false);
  const result = compareRaceSteps({ p95Us: 100 }, { p95Us: 300 });
  assert.equal(result.samplesBudget, 'NOT VERIFIED');
  assert.equal(result.webglBudget, 'NOT VERIFIED');
});
