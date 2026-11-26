import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createBridgeTowers } from '../src/bridge-towers.ts';

const meshesOf = root => { const out = []; root.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
// Every triangle corner in the tower's local space, per material, as sorted rounded keys.
function corners(root) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(), v = new THREE.Vector3(), out = new Map();
  for (const mesh of meshesOf(root)) {
    const local = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    const { position } = mesh.geometry.attributes, index = mesh.geometry.index;
    const list = out.get(mesh.material) ?? []; out.set(mesh.material, list);
    for (let i = 0; i < (index ? index.count : position.count); i++) {
      v.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(local);
      list.push(v.toArray().map(n => n.toFixed(4)).join());
    }
  }
  for (const list of out.values()) list.sort();
  return out;
}

test('world.js builds the bridge towers through the shared module', () => {
  const source = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(source, /createBridgeTowers\(scene\)/);
  assert.doesNotMatch(source, /CatmullRomCurve3\(cablePoints\)/, 'the tower builder moved out of world.js');
});

test('each bridge tower draws its steel and its trim once, keeping every triangle', () => {
  const scene = new THREE.Scene();
  const towers = createBridgeTowers(scene);
  assert.equal(towers.length, 3);
  for (const tower of towers) {
    assert.equal(tower.name, 'Bridge tower', 'browser specs select the towers by this name');
    const meshes = meshesOf(tower);
    assert.equal(meshes.length, 2, '55 steel + 3 trim meshes become two static draws');
    assert.deepEqual(new Set(meshes.map(m => m.material.type)), new Set(['MeshStandardMaterial', 'MeshBasicMaterial']));
  }
});

test('the merged tower keeps the same local-space triangles per material', async () => {
  const { block, material } = await import('../src/car-model.js');
  const scene = new THREE.Scene();
  const [tower] = createBridgeTowers(scene);
  const merged = corners(tower);
  // Reference: the same authored parts, unmerged.
  const reference = new THREE.Group();
  const steel = material('#233e55', 0.65, 0.4), trim = new THREE.MeshBasicMaterial();
  for (const side of [-1, 1]) {
    block(reference, steel, side * 16.5, 23, 0, 1.2, 46, 2.5);
    block(reference, trim, side * 15.85, 29, 1.3, 0.08, 32, 0.08);
    const points = Array.from({ length: 25 }, (_, i) => {
      const z = (i - 12) * 12;
      return new THREE.Vector3(side * 16.5, 9 + 34 * Math.cos(z / 288 * Math.PI) ** 2, z);
    });
    reference.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.1, 4, false), steel));
    points.forEach(p => { block(reference, steel, p.x, p.y / 2, p.z, 0.045, p.y, 0.045); });
  }
  block(reference, steel, 0, 43, 0, 34, 1.7, 2.5);
  block(reference, trim, 0, 42.1, 1.3, 32, 0.08, 0.08);
  const expected = corners(reference);
  const byType = map => Object.fromEntries([...map].map(([m, list]) => [m.type, list]));
  assert.deepEqual(byType(merged), byType(expected));
});
