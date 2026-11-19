import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSkyScene } from '../src/sky-scene.js';
import { skyPosition, SKY_LENGTH } from '../src/sky-track.ts';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.002, `${actual} ≈ ${expected}`);

test('Sky Spiral streams road geometry only when its 10m sector changes', () => {
  const scene = new THREE.Scene(), kit = createSkyScene(scene);
  const root = scene.getObjectByName('Sky Spiral 3D course');
  kit.update(1700, 'medium');
  const road = root.children.find(mesh => mesh.geometry?.attributes?.position && mesh.material?.isMeshStandardMaterial);
  const stripes = root.children.find(mesh => mesh.isInstancedMesh);
  assert.ok(road && stripes);
  const vertices = road.geometry.attributes.position;
  const before = vertices.version, beforeMatrices = stripes.instanceMatrix.version;
  kit.update(1700.4, 'medium');
  assert.equal(vertices.version, before, 'no full 180-row road upload inside the same sector');
  assert.equal(stripes.instanceMatrix.version, beforeMatrices, 'reuse rail/line matrices between sectors');
  const start = Math.max(0, Math.floor((1700 - 140) / 10) * 10);
  const expected = skyPosition(start, -12, 0, 1700.4);
  [road.position.x + vertices.getX(0), road.position.y + vertices.getY(0),
    road.position.z + vertices.getZ(0)].forEach((value, i) => near(value, expected[i]));
  kit.update(1710.4, 'medium');
  assert.ok(vertices.version > before, 'upload the next sector once');
  assert.ok(stripes.instanceMatrix.version > beforeMatrices, 'reuse the allocated meshes');
  kit.dispose();
});

// Task 8c: the look's kit (spiral-scenery.ts) rides this hook; it must see the road where this frame put it.
test('the look\'s streaming hook runs once per frame, after the road has moved, with the endless flag', () => {
  const scene = new THREE.Scene(), kit = createSkyScene(scene), { parts } = kit, seen = [];
  kit.update(1700, 'medium');
  assert.equal(parts.stream, undefined, 'no hook until the look sets one');
  parts.stream = (distance, endless) => seen.push([distance, endless, parts.road.position.clone()]);
  kit.update(1900, 'medium');
  kit.update(12000, 'medium', true);
  assert.deepEqual(seen.map(([distance, endless]) => [distance, endless]), [[1900, false], [12000, true]]);
  assert.ok(seen[1][2].equals(parts.road.position), 'the road was already moved for this frame');
  assert.ok(!seen[0][2].equals(seen[1][2]));
  kit.dispose();
});

test('Sky Spiral road keeps the same camera-relative geometry after large teleports', () => {
  const scene = new THREE.Scene(), kit = createSkyScene(scene);
  const root = scene.getObjectByName('Sky Spiral 3D course');
  const road = root.children.find(mesh => mesh.geometry?.attributes?.position && mesh.material?.isMeshStandardMaterial);
  for (const distance of [0, 1800, 3100, 5200, 1200]) {
    kit.update(distance, 'high');
    const start = Math.max(0, Math.floor((distance - 140) / 10) * 10);
    const expected = skyPosition(start, -12, 0, distance);
    [road.position.x + road.geometry.attributes.position.getX(0),
      road.position.y + road.geometry.attributes.position.getY(0),
      road.position.z + road.geometry.attributes.position.getZ(0)]
      .forEach((v, i) => near(v, expected[i]));
  }
  kit.dispose();
});


// road-runout rule: a road that ends at the finish must not end under the parked car.
test('the road runs on past the finish instead of ending in the air under the parked car', () => {
  const scene = new THREE.Scene(), kit = createSkyScene(scene), { road } = kit.parts;
  kit.update(SKY_LENGTH, 'high');
  const vertices = road.geometry.attributes.position, index = road.geometry.index;
  const last = vertices.count / 2 - 1, start = Math.floor((SKY_LENGTH - 140) / 10) * 10;
  const finishRow = (SKY_LENGTH - start) / 10;
  // The car is the origin: the last row lies well ahead of it, on the Endless continuation of the route.
  const ahead = Math.hypot(road.position.x + vertices.getX(last * 2), road.position.z + vertices.getZ(last * 2));
  assert.ok(ahead > 1400, `the road reaches ${ahead.toFixed(0)} m past the finish`);
  const expected = skyPosition(start + last * 10, -12, 0, SKY_LENGTH, true);
  near(road.position.x + vertices.getX(last * 2), expected[0]);
  near(road.position.z + vertices.getZ(last * 2), expected[2]);
  for (let row = finishRow; row < last; row++) {
    assert.notEqual(index.getX(row * 6), index.getX(row * 6 + 1), `row ${row} past the finish is drawn`);
  }
  kit.dispose();
});
