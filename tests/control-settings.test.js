import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTROLS_KEY, controlSettings } from '../src/control-settings.js';

const defaults = { mode: 'slide', hand: 'left', fullLock: 60, size: 'M', opacity: 0.9, flyMode: 'hold', version: 1 };

test('non-objects and outdated versions fall back to defaults', () => {
  assert.equal(CONTROLS_KEY, 'skyline-rush-controls');
  for (const bad of [undefined, null, 'x', 7, [], {}, { version: 0, hand: 'right' }, { version: 2, hand: 'right' }]) {
    assert.deepEqual(controlSettings(bad), defaults);
  }
});

test('valid values round-trip and unknown keys are dropped', () => {
  const valid = { mode: 'buttons', hand: 'right', fullLock: 80, size: 'L', opacity: 0.5, flyMode: 'toggle', version: 1 };
  assert.deepEqual(controlSettings({ ...valid, extra: true }), valid);
});

test('bad values fall back per field; opacity clamps to 0.4-1', () => {
  const result = controlSettings({ version: 1, mode: 'x', hand: 1, fullLock: 50, size: 'XL', flyMode: null, opacity: NaN });
  assert.deepEqual(result, defaults);
  assert.equal(controlSettings({ version: 1, opacity: 0 }).opacity, 0.4);
  assert.equal(controlSettings({ version: 1, opacity: 5 }).opacity, 1);
  assert.equal(controlSettings({ version: 1, opacity: '0.5' }).opacity, 0.9);
});
