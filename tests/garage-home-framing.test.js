import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');

// Trap (2026-11-21, 0.33.0 CI): `data-car-in-frame` was measured against `smoothLook`, which only the classic
// Home path updates. On a Coming Soon track it held a stale target, so the marker flipped with timing and hid a
// car clipped at the Garage edge. .claude/rules/garage-home-framing.md
test('Garage Home bounds are read from the camera that draws the frame, not from the classic smoothLook', () => {
  const line = read('world.js').split('\n').find(l => l.includes('inspectGarageStudio()'));
  assert.ok(line, 'inspectGarageStudio exists');
  assert.doesNotMatch(line, /smoothLook/);
  assert.match(line, /camera\.getWorldDirection/);
});

// Trap (2026-11-22): the marker projected the classic `player` group, which a Coming Soon track never draws
// (its car is the stage's own), so a car 2.4 m off to the side made stormline Rear read "out of frame" on an idle
// runner. The Garage must measure the car the stage draws.
test('Garage Home bounds measure the Coming Soon stage car, not the classic player', () => {
  const line = read('world.js').split('\n').find(l => l.includes('inspectGarageStudio()'));
  assert.match(line, /projectedCarBounds\([^;]*upcomingStage\.modelHost/);
  const bounds = read('car-bounds.ts');
  assert.match(bounds, /host\?: \{ car: THREE\.Object3D; keep: THREE\.Object3D \}/);
  assert.match(bounds, /const car = host\?\.car \?\? player/);
});

test('a Coming Soon Garage preview centres the car instead of leaving room for the Home panel', () => {
  const src = read('upcoming-showcase.ts');
  assert.match(src, /const centred = portrait \|\| !!garageSkins/);
  assert.match(src, /showcaseCameraPose\(stage\.id, settings\.view, calm \? 0 : time, centred\)/);
});

test('the Garage re-samples the car bounds when the showcase view changes', () => {
  const src = read('garage-ui.ts');
  assert.match(src, /attributeFilter: \['data-view'\]/);
  assert.match(src, /studioViewGeneration/);
});
