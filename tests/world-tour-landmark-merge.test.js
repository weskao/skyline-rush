import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WORLD_THEMES, createWorldTourScene } from '../src/world-tour-scene.js';
import { makeLandmark } from '../src/world-tour-landmarks.js';
import { RACE_TRACKS } from '../src/game.js';

const ids = ['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
const key = mesh => [mesh.material.uuid, mesh.castShadow, mesh.receiveShadow, mesh.layers.mask, mesh.frustumCulled].join('|');
// Per material colour: triangle-vertex count, world bounds and first/second coordinate moments.
// Baking runs in float32, so values are compared at 1 mm, not bit for bit.
function soup(root) {
  root.updateMatrixWorld(true);
  const byColour = new Map(), v = new THREE.Vector3();
  root.traverseVisible(object => {
    if (!object.isMesh) return;
    const { position } = object.geometry.attributes, index = object.geometry.index;
    const count = index ? index.count : position.count, colour = object.material.color.getHexString();
    const s = byColour.get(colour) ?? { count: 0, box: new THREE.Box3(), sum: [0, 0, 0], squares: [0, 0, 0] };
    byColour.set(colour, s);
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(object.matrixWorld);
      s.count++; s.box.expandByPoint(v);
      v.toArray().forEach((x, axis) => { s.sum[axis] += x; s.squares[axis] += x * x; });
    }
  });
  return [...byColour].sort().map(([colour, s]) => ({ colour, count: s.count, values: [
    ...s.box.min.toArray(), ...s.box.max.toArray(), ...s.sum.map(x => x / s.count), ...s.squares.map(x => Math.sqrt(x / s.count))] }));
}
function assertSameSoup(actual, expected, label) {
  assert.deepEqual(actual.map(s => [s.colour, s.count]), expected.map(s => [s.colour, s.count]), label);
  actual.forEach((s, i) => s.values.forEach((x, j) =>
    assert.ok(Math.abs(x - expected[i].values[j]) < 1e-3, `${label}: ${s.colour}[${j}] ${x} vs ${expected[i].values[j]}`)));
}

test('World Tour landmarks draw one static mesh per material with identical world geometry', () => {
  const scene = new THREE.Scene(), tour = createWorldTourScene(scene);
  try {
    for (const id of ids) {
      for (const item of WORLD_THEMES[id].landmarks) {
        tour.update(id, item.at, 'high', RACE_TRACKS[id].sections);
        const hero = tour.landmarks().find(h => h.userData.entry === item);
        const meshes = [];
        hero.traverse(o => { if (o.isMesh) meshes.push(o); });
        assert.equal(new Set(meshes.map(key)).size, meshes.length, `${id} ${item.kind}: repeated material draws`);
        const source = makeLandmark(item.kind, WORLD_THEMES[id]);
        hero.updateMatrixWorld(true);
        source.matrix.copy(hero.matrixWorld); source.matrixAutoUpdate = false;
        assertSameSoup(soup(hero), soup(source), `${id} ${item.kind}: geometry or material changed`);
      }
    }
  } finally { tour.dispose(); }
});

test('track switches dispose the merged landmark geometry they own', () => {
  const scene = new THREE.Scene(), tour = createWorldTourScene(scene);
  try {
    tour.update('taipei', 1000, 'high', RACE_TRACKS.taipei.sections);
    const owned = new Set();
    for (const hero of tour.landmarks()) hero.traverse(o => { if (o.isMesh && o.userData.ownGeometry) owned.add(o.geometry); });
    assert.ok(owned.size > 0, 'merged landmark geometry is owned by the scene');
    let disposed = 0;
    for (const geometry of owned) geometry.addEventListener('dispose', () => disposed++);
    tour.update('tokyo', 1000, 'high', RACE_TRACKS.tokyo.sections);
    assert.equal(disposed, owned.size);
  } finally { tour.dispose(); }
});
