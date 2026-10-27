import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameStats, PERF_WINDOW } from '../src/perf.ts';

test('frame stats report nearest-rank p50 / p95 and the average frame rate', () => {
  const samples = [...Array(95).fill(16), ...Array(5).fill(40)];
  assert.deepEqual(frameStats(samples), { count: 100, p50: 16, p95: 16, fps: 58.1 });
  samples.push(40); // the 101st frame tips the 95th percentile into the slow frames
  assert.equal(frameStats(samples).p95, 40);
});

test('no samples is reported as empty, not as zero milliseconds', () => {
  assert.equal(frameStats([]), null);
});

test('the sampling window is the 20 seconds the device plan asks for', () => {
  assert.equal(PERF_WINDOW, 20);
});
