import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSkyScene } from '../src/sky-scene.js';
import { skyPosition } from '../src/sky-track.ts';

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

