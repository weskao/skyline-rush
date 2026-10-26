import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { Object3D, Vector3 } from 'three';
import { orientCarOnRoad } from '../src/vehicle-pose.ts';

test('vehicle pose has one strict TypeScript implementation preserving road-relative orientation', () => {
  assert.equal(existsSync(new URL('../src/vehicle-pose.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/vehicle-pose.js', import.meta.url)), false);
  const car = new Object3D();
  const frame = { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] };
  const ret = orientCarOnRoad(car, frame);
  assert.equal(ret, car, 'caller continues to receive the same object');
  assert.ok(new Vector3(0, 1, 0).applyQuaternion(car.quaternion).distanceTo(new Vector3(0, 1, 0)) < 1e-9);
  const original = car.quaternion.clone();
  orientCarOnRoad(car, frame, .04, .08, -.06);
  assert.notDeepEqual(car.quaternion.toArray(), original.toArray());
  const first = car.quaternion.clone();
  orientCarOnRoad(car, frame, .04, .08, -.06);
  assert.ok(car.quaternion.angleTo(first) < 1e-7, 'no cumulative steering or pitch drift');
});
