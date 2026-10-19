import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTROLS_KEY, controlSettings } from '../src/control-settings.js';

const defaults = { mode: 'slide', hand: 'left', fullLock: 60, size: 'M', opacity: 0.9, flyMode: 'hold', sensitivity: 1, layout: {}, version: 1 };

test('non-objects and outdated versions fall back to defaults', () => {
  assert.equal(CONTROLS_KEY, 'skyline-rush-controls');
  for (const bad of [undefined, null, 'x', 7, [], {}, { version: 0, hand: 'right' }, { version: 2, hand: 'right' }]) {
    assert.deepEqual(controlSettings(bad), defaults);
  }
});

test('valid values round-trip and unknown keys are dropped', () => {
  const valid = { mode: 'buttons', hand: 'right', fullLock: 80, size: 'L', opacity: 0.5, flyMode: 'toggle', sensitivity: 1, layout: {}, version: 1 };
  assert.deepEqual(controlSettings({ ...valid, extra: true }), valid);
});

test('bad values fall back per field; opacity clamps to 0.4-1', () => {
  const result = controlSettings({ version: 1, mode: 'x', hand: 1, fullLock: 50, size: 'XL', flyMode: null, opacity: NaN });
  assert.deepEqual(result, defaults);
  assert.equal(controlSettings({ version: 1, opacity: 0 }).opacity, 0.4);
  assert.equal(controlSettings({ version: 1, opacity: 5 }).opacity, 1);
  assert.equal(controlSettings({ version: 1, opacity: '0.5' }).opacity, 0.9);
});

test('sensitivity and normalized layout survive storage validation; unsafe coordinates are dropped', () => {
  const prefs = controlSettings({ version: 1, sensitivity: 0.5, layout: { fly: { x: 0.8, y: 0.7 }, nitro: { x: 0.7, y: 0.6 }, left: { x: NaN, y: 0.4 }, unknown: { x: 0, y: 0 } } });
  assert.equal(prefs.sensitivity, 0.5);
  assert.deepEqual(prefs.layout, { fly: { x: 0.8, y: 0.7 }, nitro: { x: 0.7, y: 0.6 } });
  assert.equal(controlSettings({ version: 1, sensitivity: -10 }).sensitivity, 0.4);
  assert.equal(controlSettings({ version: 1, sensitivity: Infinity }).sensitivity, 1);
});
