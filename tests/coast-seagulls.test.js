import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { classicRoadRoute } from '../src/classic-road-routes.ts';
import { createCoastScenery } from '../src/coast-visuals.ts';
import { COAST_PIECES } from '../src/coast-scenery-glb.ts';
import { coastGullPlan, coastGullWindow, createCoastSeagulls, GULL_MIN_HEIGHT, GULL_ROAD_CLEARANCE, GULL_SLOT_METRES } from '../src/coast-seagulls.ts';

const coast = classicRoadRoute('coast');
const SLOTS = Math.ceil(10000 / GULL_SLOT_METRES); // two 5 km runs: the second is the mirrored one

/** Horizontal metres from a point to the road centreline near `distance`. */
function roadGap(x, z, distance) {
  let gap = Infinity;
  for (let d = distance - 260; d <= distance + 260; d += 2) { const [rx, rz] = coast.point(d); gap = Math.min(gap, Math.hypot(x - rx, z - rz)); }
  return gap;
}

test('the flock plan is deterministic per slot and seed', () => {
  assert.deepEqual(coastGullPlan(7), coastGullPlan(7));
  assert.deepEqual(coastGullPlan(7, 1234), coastGullPlan(7, 1234));
  const plans = Array.from({ length: SLOTS }, (_, slot) => JSON.stringify(coastGullPlan(slot)));
  assert.ok(new Set(plans).size > SLOTS * .7, 'slots differ');
  assert.notDeepEqual(Array.from({ length: 8 }, (_, slot) => coastGullPlan(slot, 99)), Array.from({ length: 8 }, (_, slot) => coastGullPlan(slot)));
  const flocks = plans.flatMap(plan => JSON.parse(plan));
  assert.ok(flocks.length >= SLOTS * .8, `a lively sky: ${flocks.length} flocks over ${SLOTS} slots`);
  assert.ok(flocks.some(flock => flock.offset < 0) && flocks.some(flock => flock.offset > 0), 'both sides of the road');
});

test('no gull ever circles over the road, a ring or a cliff top', () => {
  for (const seed of [undefined, 20261114]) for (let slot = -1; slot < SLOTS; slot++) for (const flock of coastGullPlan(slot, seed)) {
    const distance = slot * GULL_SLOT_METRES + flock.along;
    const [cx, cz] = coast.point(distance, flock.offset);
    assert.ok(flock.gulls.length >= 3, 'a flock, not a stray bird');
    for (const gull of flock.gulls) {
      assert.ok(gull.radius > 0 && gull.speed !== 0 && gull.size > 0);
      assert.ok(flock.height + gull.lift >= GULL_MIN_HEIGHT, `slot ${slot}: a gull at ${flock.height + gull.lift} m would clip the cliffs`);
      for (let k = 0; k < 16; k++) { // the whole orbit, whatever the time
        const a = k / 16 * Math.PI * 2, gap = roadGap(cx + Math.cos(a) * gull.radius, cz + Math.sin(a) * gull.radius, distance);
        assert.ok(gap >= GULL_ROAD_CLEARANCE, `slot ${slot} seed ${seed}: a gull ${gap.toFixed(1)} m from the road centre`);
      }
    }
  }
});

test('Low draws no gulls; Medium and High window the slots around the car', () => {
  assert.equal(coastGullWindow(1000, 'low'), null);
  const medium = coastGullWindow(1000, 'medium'), high = coastGullWindow(1000, 'high');
  assert.equal(high.first, Math.floor(1000 / GULL_SLOT_METRES) - 1);
  assert.ok(high.count > medium.count && medium.count >= 3);
});

test('every flock of the window shares one instanced draw call and is placed only when the window moves', () => {
  const gulls = createCoastSeagulls();
  assert.ok(gulls.mesh.isInstancedMesh);
  assert.equal(gulls.mesh.name, 'Coast seagulls');
  assert.ok(gulls.mesh.geometry.index.count / 3 <= 40, 'a silhouette, a few dozen triangles');
  const window = coastGullWindow(600, 'high'), orbit = gulls.mesh.geometry.getAttribute('gull');
  gulls.place(coast, window, 0);
  const planned = [];
  for (let slot = window.first; slot < window.first + window.count; slot++) for (const flock of coastGullPlan(slot)) for (const gull of flock.gulls) planned.push({ slot, flock, gull });
  assert.ok(planned.length > 0);
  assert.equal(gulls.mesh.count, planned.length);
  assert.ok(gulls.mesh.instanceMatrix.count >= planned.length);
  const matrix = new THREE.Matrix4(), { slot, flock, gull } = planned[0], [x, z] = coast.point(slot * GULL_SLOT_METRES + flock.along, flock.offset);
  gulls.mesh.getMatrixAt(0, matrix);
  assert.deepEqual([matrix.elements[12], matrix.elements[13], matrix.elements[14]].map(v => +v.toFixed(3)), [x, flock.height + gull.lift, z].map(v => +v.toFixed(3)));
  assert.deepEqual([orbit.getX(0), orbit.getY(0), orbit.getZ(0), orbit.getW(0)], [gull.radius, gull.phase, gull.speed, gull.size].map(Math.fround));
  const version = orbit.version;
  gulls.place(coast, window, 0);
  assert.equal(orbit.version, version, 'same window: no buffer upload');
  gulls.place(coast, coastGullWindow(600 + GULL_SLOT_METRES, 'high'), 0);
  assert.ok(orbit.version > version);
  gulls.place(coast, coastGullWindow(600, 'high'), 500); // endless floating origin
  gulls.mesh.getMatrixAt(0, matrix);
  assert.equal(+matrix.elements[14].toFixed(3), +(z + 500).toFixed(3));
  gulls.setTime(12.5);
  assert.equal(gulls.mesh.material.userData.time.value, 12.5);
  // The largest window any seed can plan fits the pool.
  for (const seed of [undefined, 1, 2, 3]) for (let d = 0; d < 10000; d += GULL_SLOT_METRES) {
    gulls.place(coast, coastGullWindow(d, 'high'), 0, seed);
    assert.ok(gulls.mesh.count <= gulls.mesh.instanceMatrix.count);
  }
});

test('the gulls join the Coast scenery only with the scan coast and leave with it', () => {
  const scene = new THREE.Scene(), kit = createCoastScenery(scene), source = new THREE.Group();
  for (const name of COAST_PIECES) source.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()), { name }));
  const find = () => kit.group.getObjectByName('Coast seagulls');
  kit.update(coast, 300, 'high', undefined, 4);
  assert.equal(find(), undefined, 'no scan coast (Low, or no ?look=3d): no gulls');
  kit.attachModel(source);
  kit.update(coast, 300, 'high', undefined, 4);
  assert.ok(find().visible && find().count > 0);
  assert.equal(find().material.userData.time.value, 4);
  kit.update(coast, 300, 'low', undefined, 4);
  assert.equal(find().visible, false);
  kit.detachModel();
  assert.equal(find(), undefined);
});
