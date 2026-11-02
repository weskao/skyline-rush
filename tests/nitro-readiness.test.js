import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNitroReadiness } from '../src/nitro-readiness.ts';

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
