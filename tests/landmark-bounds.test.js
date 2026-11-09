import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { landmarkBounds } from '../src/landmark-bounds.ts';

const hero = (x, visible = true) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  mesh.position.set(x, 0, -100);
  mesh.visible = visible;
  mesh.updateMatrixWorld(true);
  return mesh;
};

test('landmark framing: bounds of the visible landmark nearest the look target live outside world.js', () => {
  const look = new THREE.Vector3(0, 0, -100);
  const box = landmarkBounds([hero(-50), hero(20), hero(1, false)], look);
  assert.ok(box?.isBox3);
  assert.deepEqual([box.min.x, box.max.x], [19, 21], 'nearest visible one; the hidden nearer one is skipped');
  assert.equal(landmarkBounds([hero(1, false)], look), null, 'none shown → null');
  assert.equal(landmarkBounds([], look), null);
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /const apexBox = new THREE\.Box3\(\)/, 'world.js no longer holds the search');
});
