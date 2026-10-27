import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createClassicTrackScenery, CLASSIC_SCENIC_TRACKS } from '../src/classic-track-scenery.ts';
import { trackPoint } from '../src/track-paths.ts';

const center = distance => trackPoint('neon', distance).x;

test('Neon, Canyon and Aurora use bounded reusable instancing outside the driveable road', () => {
  assert.deepEqual([...CLASSIC_SCENIC_TRACKS], ['neon', 'canyon', 'aurora']);
  const scene = new THREE.Scene();
  const kit = createClassicTrackScenery(scene, center);
  for (const id of CLASSIC_SCENIC_TRACKS) {
    kit.update(id, 345, 'high');
    const group = kit.groups[id];
    assert.equal(group.visible, true);
    assert.ok(group.children.length >= 2 && group.children.length <= 3, id);
    for (const name of CLASSIC_SCENIC_TRACKS) if (name !== id) assert.equal(kit.groups[name].visible, false);
    for (const mesh of group.children) {
      assert.equal(mesh.isInstancedMesh, true, id);
      assert.equal(mesh.count, 24, id);
      assert.ok(mesh.geometry.attributes.position.count <= 120, 'low-poly shared geometry');
      assert.ok(mesh.material.roughness >= .6, 'avoid glossy high-cost road distractions');
      const mat = new THREE.Matrix4(), position = new THREE.Vector3();
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, mat); position.setFromMatrixPosition(mat);
        assert.ok(Math.abs(position.x - center(-position.z)) >= 30, `${id} detail must clear shoulder`);
      }
    }
  }
  kit.dispose();
  for (const id of CLASSIC_SCENIC_TRACKS) assert.ok(!scene.children.includes(kit.groups[id]));
});

test('low and medium quality fill contiguous near-road sectors after tier or track changes', () => {
  const kit = createClassicTrackScenery(new THREE.Scene(), center);
  const step = 60, distance = 1800, first = (Math.floor(distance / step) - 2) * step;
  for (const id of CLASSIC_SCENIC_TRACKS) {
    for (const [tier, count] of [['high', 24], ['low', 8], ['medium', 16], ['high', 24]]) {
      kit.update(id, distance, tier);
      for (const mesh of kit.groups[id].children) {
        const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
        const sectors = [];
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix); point.setFromMatrixPosition(matrix);
          sectors.push(Math.round(-point.z));
        }
        sectors.sort((a, b) => a - b);
        assert.deepEqual(sectors, Array.from({length: count}, (_, i) => first + i * step),
          `${id} ${tier}: no distant gaps or stale instance sectors`);
      }
    }
  }
  kit.dispose();
});

test('retiered streaming advances one recycled visible sector without per-frame allocations', () => {
  const kit = createClassicTrackScenery(new THREE.Scene(), center);
  kit.update('neon', 1840, 'low');
  const mesh = kit.groups.neon.children[0], before = new THREE.Matrix4(), after = new THREE.Matrix4();
  const previous = Array.from({length: mesh.count}, (_, i) => {
    mesh.getMatrixAt(i, before); return [...before.elements];
  });
  kit.update('neon', 1840.5, 'low');
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, after); assert.deepEqual([...after.elements], previous[i]);
  }
  kit.update('neon', 1860.5, 'low');
  let changed = 0;
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, after);
    if (after.elements.some((v,j) => v !== previous[i][j])) changed++;
  }
  assert.equal(changed, 1, 'only one ring-buffer slot moves at the sector boundary');
  kit.dispose();
});

test('Quality caps and streaming geometry are deterministic without per-frame churn', () => {
  const scene = new THREE.Scene(), kit = createClassicTrackScenery(scene, center);
  kit.update('neon', 359.9, 'high');
  const mesh = kit.groups.neon.children[0];
  const matrix = new THREE.Matrix4();
  const snapshot = Array.from({length: mesh.count}, (_, i) => {mesh.getMatrixAt(i,matrix); return [...matrix.elements]});
  kit.update('neon', 359.95, 'high');
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i,matrix); assert.deepEqual([...matrix.elements], snapshot[i], 'same sector reuses matrices');
  }
  kit.update('neon', 360.1, 'high');
  let stable = 0;
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i,matrix);
    if(matrix.elements.every((v,j)=>v===snapshot[i][j])) stable++;
  }
  assert.ok(stable >= mesh.count - 1, 'crossing one tile reuses other instances');
  for (const [quality, count] of [['low', 8], ['medium', 16], ['high', 24]]) {
    kit.update('aurora', 560, quality);
    for (const m of kit.groups.aurora.children) assert.equal(m.count, count);
  }
  kit.hide();
  for (const id of CLASSIC_SCENIC_TRACKS) assert.equal(kit.groups[id].visible, false);
  kit.dispose();
});
