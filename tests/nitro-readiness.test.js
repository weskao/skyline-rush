import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNitroReadiness, nitroFill } from '../src/nitro-readiness.ts';

test('NITRO uses one charge as action threshold; pause and lock are unavailable', () => {
  const f = createNitroReadiness();
  assert.deepEqual(f.update({ charge: 0.99, phase: 'racing', active: false }), { state: 'charging', cueReady: false });
  assert.deepEqual(f.update({ charge: 1, phase: 'racing', active: false }), { state: 'ready', cueReady: true });
  assert.deepEqual(f.update({ charge: 1.1, phase: 'racing', active: false }), { state: 'ready', cueReady: false });
  assert.deepEqual(f.update({ charge: 2, phase: 'racing', active: true }), { state: 'active', cueReady: false });
  assert.deepEqual(f.update({ charge: 2, phase: 'paused', active: false }), { state: 'disabled', cueReady: false });
  assert.deepEqual(f.update({ charge: 2, phase: 'racing', active: false, locked: true }), { state: 'disabled', cueReady: false });
});

test('READY emits exactly once across stale frames, pause/resume, and threshold jitter', () => {
  const f = createNitroReadiness();
  f.update({ charge: 0.5, phase: 'racing', active: false });
  assert.equal(f.update({ charge: 1.001, phase: 'racing', active: false }).cueReady, true);
  assert.equal(f.update({ charge: 0.99, phase: 'racing', active: false }).cueReady, false);
  assert.equal(f.update({ charge: 1.01, phase: 'racing', active: false }).cueReady, false);
  f.update({ charge: 1.01, phase: 'paused', active: false });
  assert.equal(f.update({ charge: 1.01, phase: 'racing', active: false }).cueReady, false);
});

test('a real consumed charge rearms a later READY, but race initialization never plays a stale cue', () => {
  const f = createNitroReadiness();
  assert.deepEqual(f.update({ charge: 3, phase: 'racing', active: false }), { state: 'ready', cueReady: false });
  f.update({ charge: 0.8, phase: 'racing', active: false });
  assert.equal(f.update({ charge: 1, phase: 'racing', active: false }).cueReady, true);
  f.update({ charge: 0.1, phase: 'racing', active: true });
  assert.equal(f.update({ charge: 1.25, phase: 'racing', active: false }).cueReady, true);
  f.reset();
  assert.equal(f.update({ charge: 3, phase: 'racing', active: false }).cueReady, false);
});

test('invalid charge is sanitized and does not fire a false READY cue', () => {
  const f = createNitroReadiness();
  assert.equal(f.update({ charge: Number.NaN, phase: 'racing', active: false }).state, 'charging');
  assert.equal(f.update({ charge: Infinity, phase: 'racing', active: false }).cueReady, false);
});

test('refilling a usable charge during a NITRO burst cues once and can extend the burst', () => {
  const nitro = createNitroReadiness();
  nitro.update({ charge: .75, phase: 'racing', active: true });
  assert.deepEqual(nitro.update({ charge: 1.05, phase: 'racing', active: true }), { state: 'active', cueReady: true });
  assert.equal(nitro.update({ charge: 1.05, phase: 'racing', active: false }).cueReady, false);
});

test('the charging fill covers the first charge in floored 2% steps', () => {
  assert.equal(nitroFill(0), 0);
  assert.equal(nitroFill(0.459), 0.44);
  assert.equal(nitroFill(0.46), 0.46);
  // Never shows full before the charge is actually ready.
  assert.equal(nitroFill(0.999), 0.98);
  assert.equal(nitroFill(1), 1);
  assert.equal(nitroFill(2.7), 1);
  assert.equal(nitroFill(-1), 0);
  assert.equal(nitroFill(Number.NaN), 0);
});
