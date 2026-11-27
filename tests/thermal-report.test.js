import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as report from '../scripts/thermal-report.mjs';

const scenario = { id: 'coast', phase: 'racing' };
const record = () => ({ scenario: 'racing', track: 'coast', seed: 12345, requestedFrames: 32,
  drawnCount: 32, startDistance: 0, endDistance: 10, endPhase: 'racing',
  diagnostics: { source: 'unclassified-browser-webgl', gpuStatus: 'unsupported', current: 'racing/coast',
    reports: { 'racing/coast': { mixedConfig: false, config: { targetWidth: 256, targetHeight: 192, targetFps: 60 },
      load: { drawCalls: 20, triangles: 100 }, metrics: {
        cpuSimulationMs: { count: 32 }, cpuRenderSubmissionMs: { count: 32 }, frameIntervalMs: { count: 31 },
      } } } } });
test('accepts measured CPU/render evidence without pretending unsupported GPU is measured', () => {
  assert.doesNotThrow(() => report.validateThermalRecord(record(), scenario, 32));
});
test('rejects empty draws, stationary racing or missing phase measurements', () => {
  for (const mutate of [r => r.drawnCount = 0, r => r.endDistance = 0, r => r.diagnostics.reports = {},
    r => r.diagnostics.reports['racing/coast'].metrics.frameIntervalMs.count = 0,
    r => r.diagnostics.reports['racing/coast'].mixedConfig = true, r => r.track = 'neon']) {
    const r = record(); mutate(r);
    assert.throws(() => report.validateThermalRecord(r, scenario, 32), /thermal evidence/i);
  }
});
