import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareRuns, renderTable } from '../scripts/thermal-compare.mjs';

const config = { targetWidth: 1170, targetHeight: 2532, targetFps: 60 };
const record = (cpu, calls, cfg = config, mixed = false) => ({ scenario: 'racing', track: 'coast', diagnostics: { current: 'racing/coast', reports: { 'racing/coast': {
  mixedConfig: mixed, config: cfg, load: { drawCalls: calls, triangles: 1000 },
  metrics: { cpuSimulationMs: { p50: cpu, p95: cpu * 2 }, frameIntervalMs: { p50: 16.7, p95: 17 } } } } } });
const run = (rec, extra = {}) => ({ harness: 'fixed-step-scene-probe', frames: 180, width: 390, height: 844, dpr: 3, source: 'unclassified-browser-webgl', records: [rec], ...extra });

test('compares matched scenarios and renders a delta', () => {
  const result = compareRuns(run(record(2, 100)), run(record(1, 80)));
  const cpu = result.rows.find(r => r.metric === 'cpuSimulationMs');
  assert.deepEqual([cpu.before, cpu.after], [2, 1]);
  assert.match(renderTable(result), /cpuSimulationMs \| 2 \| 1 \| -50\.0%/);
});
test('refuses unequal harness settings and skips mixed or unequal render config', () => {
  assert.throws(() => compareRuns(run(record(2, 1)), run(record(2, 1), { dpr: 2 })), /dpr/);
  for (const after of [record(1, 1, { ...config, targetFps: 30 }), record(1, 1, config, true)]) {
    const result = compareRuns(run(record(2, 1)), run(after));
    assert.equal(result.rows.length, 0); assert.equal(result.skipped.length, 1);
  }
});
