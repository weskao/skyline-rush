import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('cloud progress merging and schema validation have one strictly typed owner', async () => {
  assert.equal(existsSync(new URL('../src/cloud-progress-merge.ts', import.meta.url)), true);
  const legacy = readFileSync(new URL('../src/cloud-progress.js', import.meta.url), 'utf8');
  assert.match(legacy, /export\s*\{[^}]*mergeProgress[^}]*\}\s*from\s*['"]\.\/cloud-progress-merge\.ts['"]/);
  assert.doesNotMatch(legacy, /export function mergeProgress\(|function raceRun\(|function modeRun\(|function dailyRun\(/);
  const { mergeProgress, mergeUnlocks, cloudFailureStatus } = await import('../src/cloud-progress-merge.ts');
  assert.deepEqual(mergeUnlocks(['neon', 'neon'], ['unknown', 'future-road']), ['coast', 'neon']);
  assert.equal(cloudFailureStatus({code:'unavailable'}, false), 'cloud.localFailed');
  const date = '2026-10-24T00:00:00Z';
  const classic = { date, track: 'coast', position: 1, time: 60, rings: 2 };
  const remote = { version: 2, history: [{ ...classic, rings: 3 }], stars: { coast: 3 }, bests: { coast: 59 } };
  const merged = mergeProgress({ history: [classic], stars: { coast: 2 } }, remote);
  assert.equal(merged.history.length, 1);
  assert.equal(merged.history[0].rings, 3, 'cloud telemetry wins for identical attempt');
  assert.deepEqual(merged.stars, { coast: 3 });
  assert.equal(merged.bests.coast, 59);
  assert.deepEqual(mergeProgress(merged, remote), merged);
  assert.throws(() => mergeProgress({}, {version: 4}), /Unsupported cloud save/);
  assert.deepEqual(mergeProgress({}, {version: 2, stars: {coast:'3'}}).stars, {});
});
