import { test } from 'node:test';
import assert from 'node:assert/strict';
import { controlSettings } from '../src/control-settings.ts';

test('stored controls reject malformed nested touch coordinates without losing valid buttons', () => {
  const preferences = controlSettings({
    version: 1,
    hand: 'right',
    layout: {
      fly: { x: 0.8, y: 0.7 },
      brake: { x: 1, y: 0 },
      left: { x: Infinity, y: 0.2 },
      right: { x: 0.3, y: -1 },
      boost: { x: '0.4', y: 0.2 },
      unknown: { x: 0.4, y: 0.2 },
    },
  });
  assert.equal(preferences.hand, 'right');
  assert.deepEqual(preferences.layout, {
    fly: { x: 0.8, y: 0.7 },
    brake: { x: 1, y: 0 },
  });
});

test('malformed persisted preferences never leak invalid modes into controller', () => {
  const preferences = controlSettings({ version: 1, mode: 'invalid', size: 'XXL', opacity: -2, flyMode: 'broken' });
  assert.equal(preferences.mode, 'slide');
  assert.equal(preferences.size, 'M');
  assert.equal(preferences.opacity, 0.4);
  assert.equal(preferences.flyMode, 'hold');
});
