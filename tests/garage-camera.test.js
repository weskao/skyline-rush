import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultGarageCamera, garagePreset, dragGarageCamera, zoomGarageCamera, toggleGarageOrbit } from '../src/garage-camera.ts';

test('scenario 2 — Orbit: drag rotates within safe pitch and does not affect paint', () => {
  const camera = dragGarageCamera(defaultGarageCamera(), 100, -500);
  assert.ok(camera.yaw !== defaultGarageCamera().yaw);
  assert.equal(camera.pitch, 1.18);
  assert.equal(camera.zoom, 1);
  assert.equal(camera.autoRotate, false);
  assert.equal(dragGarageCamera(camera, 0, 10000).pitch, 0.08);
});
test('scenario 2 — Orbit: wheel, pinch and button zoom have finite safe bounds', () => {
  assert.equal(zoomGarageCamera(defaultGarageCamera(), Infinity).zoom, 1);
  assert.equal(zoomGarageCamera(defaultGarageCamera(), 0.001).zoom, .75);
  assert.equal(zoomGarageCamera(defaultGarageCamera(), 100).zoom, 1.6);
});
test('scenario 2 — Orbit: view presets, auto rotation and reset are independent', () => {
  const top = garagePreset('top');
  assert.equal(top.pitch, 1.18);
  assert.equal(top.autoRotate, false);
  assert.equal(garagePreset('unknown').zoom, 1);
  assert.equal(toggleGarageOrbit(top).autoRotate, true);
  assert.deepEqual(defaultGarageCamera(), { yaw: .7, pitch: .27, zoom: 1, autoRotate: true });
});

test('scenario 2 — releasing drag resumes slow orbit unless explicitly paused', async () => {
  const { releaseGarageOrbit } = await import('../src/garage-camera.ts');
  const moved = dragGarageCamera(defaultGarageCamera(), 50, 0);
  assert.equal(releaseGarageOrbit(moved, false).autoRotate, true);
  assert.equal(releaseGarageOrbit(moved, true).autoRotate, false);
});
