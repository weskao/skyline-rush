import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metricStats, deepPerfPhase, createDeepPerf } from '../src/deep-perf.ts';

test('deep percentiles use nearest rank, including p99 and empty samples', () => {
  assert.equal(metricStats([]), null);
  assert.deepEqual(metricStats([0, 0, 0]), { count: 3, p50: 0, p95: 0, p99: 0, mean: 0 });
  const result = metricStats(Array.from({ length: 100 }, (_, i) => 100 - i));
  assert.deepEqual(result, { count: 100, p50: 50, p95: 95, p99: 99, mean: 50.5 });
});
test('phase attribution distinguishes dialogs from the underlying race state', () => {
  assert.equal(deepPerfPhase('ready', false, false), 'home');
  assert.equal(deepPerfPhase('ready', true, false), 'garage');
  assert.equal(deepPerfPhase('paused', false, true), 'photo');
  assert.equal(deepPerfPhase('finished', false, false), 'results');
  for (const phase of ['countdown', 'racing', 'paused']) assert.equal(deepPerfPhase(phase, false, false), phase);
});
test('production and legacy ?perf touch no renderer, composer, timer query or listener', () => {
  const untouched = new Proxy({}, { get(_, key) { throw Error('diagnostics touched ' + String(key)); } });
  for (const search of ['', '?perf', '?perf=1', '?perf=Deep', '?seed=1&perf=off']) {
    assert.equal(createDeepPerf(search, untouched, untouched, () => 'high'), null, search);
  }
});
