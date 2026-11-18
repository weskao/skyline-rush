import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { frameStats, PERF_WINDOW, drawnTriangles } from '../src/perf.ts';

test('drawn triangles count what the camera draws: visible, on its layers, within draw range, per group and instance', () => {
  const camera = new THREE.PerspectiveCamera(), car = new THREE.Group();
  const box = new THREE.BoxGeometry(); // 12 triangles, indexed, 6 groups
  car.add(new THREE.Mesh(box, new THREE.MeshBasicMaterial()));
  const ranged = new THREE.Mesh(box.clone(), new THREE.MeshBasicMaterial());
  ranged.geometry.setDrawRange(0, 9); // returns undefined, so it cannot be chained
  const halves = box.clone();
  halves.clearGroups(); halves.addGroup(0, 18, 0); halves.addGroup(18, 18, 1);
  const grouped = new THREE.Mesh(halves, [new THREE.MeshBasicMaterial(), Object.assign(new THREE.MeshBasicMaterial(), { visible: false })]);
  const instanced = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial(), 3);
  const hidden = new THREE.Mesh(box, new THREE.MeshBasicMaterial());
  hidden.visible = false;
  const offLayer = new THREE.Mesh(box, new THREE.MeshBasicMaterial());
  offLayer.layers.set(31); // garage-model.ts HIDDEN_LAYER: the procedural parts under a dressed GLB
  car.add(ranged, grouped, instanced, hidden, offLayer);
  // 12 + 3 (9 indices) + 6 (only the half whose material is visible) + 3 × 12
  assert.equal(drawnTriangles(car, camera), 12 + 3 + 6 + 36);
});

test('frame stats report nearest-rank p50 / p95 and the average frame rate', () => {
  const samples = [...Array(95).fill(16), ...Array(5).fill(40)];
  assert.deepEqual(frameStats(samples), { count: 100, p50: 16, p95: 16, fps: 58.1 });
  samples.push(40); // the 101st frame tips the 95th percentile into the slow frames
  assert.equal(frameStats(samples).p95, 40);
});

test('no samples is reported as empty, not as zero milliseconds', () => {
  assert.equal(frameStats([]), null);
});

test('the sampling window is the 20 seconds the device plan asks for', () => {
  assert.equal(PERF_WINDOW, 20);
});
