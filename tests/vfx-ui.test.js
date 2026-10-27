import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupVfxUI, stepView } from '../src/vfx-ui.ts';
import { createMotion, durationMs } from '../src/motion.ts';
import { setupPerformanceNotice, claimNoticeOnce } from '../src/performance-notice-ui.ts';
import { SHOWCASE_VIEWS } from '../src/vfx-settings.ts';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('visual effects, motion timing and the performance notice each have one module', () => {
  for (const fn of [setupVfxUI, createMotion, setupPerformanceNotice]) assert.equal(typeof fn, 'function');
  for (const moved of [/function showVFX/, /function stepShowcaseView/, /const motionTokens/, /function showOneTimePerformanceNotice/, /#vfx-reset/, /#performance-notice-dismiss/, /initialDeviceVisuals\(/])
    assert.doesNotMatch(main, moved);
});

test('the showcase camera steps through every view and wraps at both ends', () => {
  assert.equal(stepView(SHOWCASE_VIEWS[0], 1), SHOWCASE_VIEWS[1]);
  assert.equal(stepView(SHOWCASE_VIEWS[0], -1), SHOWCASE_VIEWS.at(-1));
  assert.equal(stepView(SHOWCASE_VIEWS.at(-1), 1), SHOWCASE_VIEWS[0]);
});

test('CSS motion tokens convert to milliseconds whether written in ms or s', () => {
  assert.equal(durationMs('180ms'), 180);
  assert.equal(durationMs('0.4s'), 400);
  assert.equal(durationMs(' 1.2s '), 1200);
});

test('the reduced-quality notice is claimed once, and still shows when storage is blocked', () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.equal(claimNoticeOnce(false, storage), false, 'High quality never shows it');
  assert.equal(claimNoticeOnce(true, storage), true);
  assert.equal(claimNoticeOnce(true, storage), false, 'only once');
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(claimNoticeOnce(true, blocked), true);
});
