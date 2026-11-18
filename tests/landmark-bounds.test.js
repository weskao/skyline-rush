import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { nearestLandmark } from '../src/landmark-bounds.ts';

const hero = (x, visible = true) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  mesh.position.set(x, 0, -100);
  mesh.visible = visible;
  mesh.updateMatrixWorld(true);
  return mesh;
};

test('landmark framing ignores a nearer hidden scene object', () => {
  const look = new THREE.Vector3(0, 0, -100);
  const visible = hero(20);
  assert.equal(nearestLandmark([hero(-50), visible, hero(1, false)], look), visible);
  assert.equal(nearestLandmark([hero(1, false)], look), null);
  assert.equal(nearestLandmark([], look), null);
});
