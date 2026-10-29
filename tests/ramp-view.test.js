import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

let view = {};
try { view = await import('../src/ramp-view.ts'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('authored ramps draw from one pooled wedge sized by the catalog', () => {
  assert.equal(typeof view.createRampPool, 'function', 'ramp renderer pool must exist');
  const scene = new THREE.Scene();
  const mesh = view.createRampPool(scene);
  assert.equal(scene.getObjectByName('launch-ramps'), mesh);
  assert.equal(mesh.count, 0);
  assert.equal(mesh.instanceMatrix.count, 8);
  const box = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
  assert.deepEqual([box.min.y, box.max.y], [0, 1]);
  const position = mesh.geometry.attributes.position;
  for (let i = 0; i < position.count; i++) if (position.getY(i) === 1) assert.equal(position.getZ(i), -0.5, 'lip faces the direction of travel');

  const ramps = [{ distance: 400, x: -2.5, halfWidth: 1.8, halfLength: 6, height: 1.2 }, { distance: 2000, x: 0, halfWidth: 1.8, halfLength: 6, height: 1.2 }];
  const at = (d, x, y) => [x, y, 300 - d];
  view.drawRamps(mesh, ramps, 300, at);
  assert.equal(mesh.count, 1, 'only ramps inside the draw window are placed');
  const matrix = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  mesh.getMatrixAt(0, matrix); matrix.decompose(p, q, s);
  assert.deepEqual([p.x, p.y, p.z, s.x, s.y, s.z].map(v => +v.toFixed(3)), [-2.5, 0, -100, 3.6, 1.2, 12]);
  view.drawRamps(mesh, undefined, 300, at);
  assert.equal(mesh.count, 0);
});
