import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupTouchControlsUI, inputPrefsFor, layoutPosition, layoutPoint } from '../src/touch-controls-ui.ts';
import { controlSettings } from '../src/control-settings.ts';

test('touch controls, slide pad, tilt and layout editing have one controller', () => {
  assert.equal(typeof setupTouchControlsUI, 'function');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/function applyControls/, /function drawPad/, /function enableTilt/, /let controlPrefs/, /#layout-edit/, /#controls-reset/, /TOUCH_SCALE/])
    assert.doesNotMatch(main, moved);
});

test('practice falls back to slide steering until tilt permission is granted', () => {
  const tilt = controlSettings({ version: 1, mode: 'tilt' });
  assert.equal(inputPrefsFor(tilt, { tutorial: true, tiltGranted: false, editing: false }).mode, 'slide');
  assert.equal(inputPrefsFor(tilt, { tutorial: true, tiltGranted: true, editing: false }).mode, 'tilt');
  assert.equal(inputPrefsFor(tilt, { tutorial: false, tiltGranted: false, editing: true }).mode, 'tilt');
  assert.equal(inputPrefsFor(tilt, { tutorial: false, tiltGranted: false, editing: true }).editing, true);
});

test('a placed button keeps its safe-area margin and mirrors for the right hand', () => {
  const left = layoutPosition({ x: 0.25, y: 0.5 }, 'left', { width: 64, height: 70 }, { width: 800, height: 400 });
  assert.equal(left.left, 'clamp(calc(env(safe-area-inset-left, 0px) + 40px), 200px, calc(100vw - env(safe-area-inset-right, 0px) - 40px))');
  assert.equal(left.top, 'clamp(calc(env(safe-area-inset-top, 0px) + 43px), 200px, calc(100dvh - env(safe-area-inset-bottom, 0px) - 43px))');
  assert.match(layoutPosition({ x: 0.25, y: 0.5 }, 'right', { width: 64, height: 70 }, { width: 800, height: 400 }).left, /, 600px, /);
});

test('an unmeasured button falls back to its CSS size for the margin', () => {
  assert.match(layoutPosition({ x: 0, y: 0 }, 'left', { width: 0, height: 0 }, { width: 800, height: 400 }).left, /\+ 40px\)/);
});

test('dragging stores a viewport-relative point, clamped 8 px inside and mirrored for the right hand', () => {
  const size = { width: 60, height: 60 }, viewport = { width: 1000, height: 500 };
  assert.deepEqual(layoutPoint(500, 250, size, 'left', viewport), { x: 0.5, y: 0.5 });
  assert.deepEqual(layoutPoint(-50, 900, size, 'left', viewport), { x: 38 / 1000, y: 462 / 500 });
  assert.deepEqual(layoutPoint(250, 250, size, 'right', viewport), { x: 0.75, y: 0.5 });
});

test('browser chrome resize preserves held steering until a real orientation change', () => {
  const source = readFileSync(new URL('../src/touch-controls-ui.ts', import.meta.url), 'utf8');
  assert.match(source, /if \(orientation !== lastOrientation\) controls\.clear\(\)/);
  assert.doesNotMatch(source, /'resize', \(\) => \{ controls\.clear\(\);/);
});
