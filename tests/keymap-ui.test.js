import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupKeyMapUI, keyLabel, keyLegendGroups } from '../src/keymap-ui.ts';
import { DEFAULT_KEY_MAP, resetKeyMap } from '../src/key-map.ts';

test('key rebinding has one controller: main.js only delegates to it', () => {
  assert.equal(typeof setupKeyMapUI, 'function');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/function showKeyMap/, /const ARROWS/, /#keymap-reset/, /\[data-rebind\]/, /let rebinding/, /let keyMap/])
    assert.doesNotMatch(main, moved);
});

test('key labels read as the printed key', () => {
  assert.equal(keyLabel('ArrowUp'), '↑');
  assert.equal(keyLabel('ArrowLeft'), '←');
  assert.equal(keyLabel('KeyW'), 'W');
  assert.equal(keyLabel('Digit7'), '7');
  assert.equal(keyLabel('ShiftLeft'), 'Left Shift');
  assert.equal(keyLabel('ShiftRight'), 'Right Shift');
  assert.equal(keyLabel('Space'), 'Space');
});

test('the start-screen legend groups one key slot per action: W A S D, then the arrows', () => {
  assert.deepEqual(keyLegendGroups(['throttle', 'left', 'brake', 'right'], DEFAULT_KEY_MAP),
    [['W', 'A', 'S', 'D'], ['↑', '←', '↓', '→']]);
});

test('left and right Shift collapse into one Shift in the legend', () => {
  assert.deepEqual(keyLegendGroups(['boost'], DEFAULT_KEY_MAP), [['Shift']]);
});

test('a rebound key that leaves a slot empty drops that group instead of showing a gap', () => {
  const map = { ...resetKeyMap(), fly: ['KeyF'] };
  assert.deepEqual(keyLegendGroups(['fly'], map), [['F']]);
  assert.deepEqual(keyLegendGroups(['nitro'], map), [['E'], ['X']]);
});
