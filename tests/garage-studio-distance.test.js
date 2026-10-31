import { test } from 'node:test';
import assert from 'node:assert/strict';
import { garageFittedDistance } from '../src/garage-camera.ts';

test('studio camera keeps the car bounding sphere in frame at minimum zoom on portrait and landscape', () => {
  const radius = 3.15;
  const vfov = 49 * Math.PI / 360;
  for (const aspect of [0.5, 0.7, 1, 1.8]) for (const zoom of [0.75, 1, 1.6]) {
    const distance = garageFittedDistance(aspect, zoom, radius);
    const halfFov = Math.atan(Math.tan(vfov) * Math.min(1, aspect));
    assert.ok(distance * Math.sin(halfFov) >= radius * 1.08, `aspect ${aspect}, zoom ${zoom} clips car`);
  }
});
test('camera fit is finite with invalid input and zoom increases only within safe bound', () => {
  const near = garageFittedDistance(1, .75, 3.15);
  const normal = garageFittedDistance(1, 1, 3.15);
  const far = garageFittedDistance(1, 1.6, 3.15);
  assert.ok(near <= normal && normal < far);
  assert.ok(Number.isFinite(garageFittedDistance(0, NaN, 3.15)));
});
