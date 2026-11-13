import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { classicRoadRoute } from '../src/classic-road-routes.ts';
import { BOATS_PER_SLOT, COAST_BOAT_PIECES, boatPose, coastBoatPlan, createCoastBoatLayer } from '../src/coast-boats.ts';
import { COAST_CHUNK_METRES, COAST_FAR_SLOT_METRES, SEA, coastChunkPlan, coastFarPlan, coastFarWindow } from '../src/coast-scenery-glb.ts';
import { createCoastScenery } from '../src/coast-visuals.ts';
import { MODEL_MANIFEST } from '../src/model-manifest.ts';

const coast = classicRoadRoute('coast');
const SEEDS = [undefined, 1001, 2002], SLOTS = 42; // 20 km: four mirrored runs of the 5 km route
const samples = (boat, n = 16) => Array.from({ length: n }, (_, i) => ({ ...boatPose(boat, boat.period * i / n) }));

/** Stand-in for the parsed coast-boats.glb: one mesh per boat, each under the meshopt dequantization offset. */
function fakeGlb() {
  const root = new THREE.Group(), material = Object.assign(new THREE.MeshStandardMaterial(), { name: 'coast_boat_paint' });
  for (const name of COAST_BOAT_PIECES) {
    const mesh = Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material), { name });
    mesh.position.y = 1;
    root.add(mesh);
  }
  return root;
}
const matrixOf = (mesh, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return m; };

test('the boat plan covers the manifest nodes and is keyed by absolute slot and endless seed', () => {
  assert.deepEqual([...COAST_BOAT_PIECES].sort(), [...MODEL_MANIFEST['coast-boats'].nodes].sort());
  assert.deepEqual(coastBoatPlan(7, coast), coastBoatPlan(7, coast), 'deterministic');
  assert.notDeepEqual(coastBoatPlan(7, coast), coastBoatPlan(8, coast));
  assert.notDeepEqual(coastBoatPlan(7, coast, 1001), coastBoatPlan(7, coast, 2002), 'endless seeds give different fleets');
  const seen = new Set();
  for (let slot = -1; slot < SLOTS; slot++) {
    const count = Object.fromEntries(COAST_BOAT_PIECES.map(piece => [piece, 0]));
    for (const boat of coastBoatPlan(slot, coast)) { seen.add(boat.piece); count[boat.piece]++; assert.ok(boat.scale > 0 && boat.period > 0); }
    for (const piece of COAST_BOAT_PIECES) assert.ok(count[piece] <= BOATS_PER_SLOT[piece], `${piece} overflows its pool in slot ${slot}`);
  }
  assert.deepEqual([...seen].sort(), [...COAST_BOAT_PIECES].sort(), 'every boat appears somewhere along 20 km');
});

test('a High window always holds a handful of boats, at mid and far distance', () => {
  const { count } = coastFarWindow(0, 'high');
  const distances = [];
  for (let first = -1; first + count <= SLOTS; first++) {
    let boats = 0;
    for (let slot = first; slot < first + count; slot++) boats += coastBoatPlan(slot, coast).length;
    assert.ok(boats >= 4 && boats <= 16, `${boats} boats in the window from slot ${first}`);
  }
  for (let slot = 0; slot < SLOTS; slot++) for (const boat of coastBoatPlan(slot, coast)) {
    let nearest = Infinity;
    for (let d = slot * COAST_FAR_SLOT_METRES - 1500; d < slot * COAST_FAR_SLOT_METRES + 2000; d += 10) { const [x, z] = coast.point(d); nearest = Math.min(nearest, Math.hypot(boat.x - x, boat.z - z)); }
    distances.push(nearest);
  }
  assert.ok(distances.filter(d => d < 280).length >= distances.length * .3, 'mid-distance boats');
  assert.ok(distances.filter(d => d >= 280).length >= distances.length * .2, 'far boats');
});

test('no boat ever sails onto the road, the close shore or into a cliff, arch, headland or sea stack', () => {
  // Footprint half extents at scale 1 along each scan's own x and z, measured from coast-scenery.glb.
  const HALF = { cliff_a: [46, 5.5], cliff_b: [20.5, 4.4], sea_arch: [36.8, 10.4], rock_a: [2.1, 2.1], rock_b: [1.3, 1.3], palm_a: [6, 6], palm_b: [5, 5] };
  const HULL = 12, ROAD = 100; // the largest boat's half length; the close cliffs, rocks and islets end 97 m from the centre line
  let checked = 0;
  for (const seed of SEEDS) for (let slot = -1; slot < SLOTS; slot++) {
    const start = slot * COAST_FAR_SLOT_METRES, obstacles = [], road = [];
    for (let d = start - 1500; d < start + 2000; d += 5) road.push(coast.point(d));
    const stand = (placement, distance) => {
      const [x, z] = coast.point(distance, placement.offset), [hx, hz] = HALF[placement.piece];
      obstacles.push({ piece: placement.piece, x, z, yaw: placement.yaw - coast.heading(distance), hx: hx * placement.scale + HULL, hz: hz * placement.scale + HULL });
    };
    for (let chunk = Math.floor((start - 1500) / COAST_CHUNK_METRES); chunk * COAST_CHUNK_METRES < start + 2000; chunk++) {
      for (const p of coastChunkPlan(chunk, seed)) if (p.piece !== 'guard_rail') stand(p, chunk * COAST_CHUNK_METRES + p.along);
    }
    for (let far = slot - 4; far <= slot + 4; far++) for (const p of coastFarPlan(far, seed)) stand(p, far * COAST_FAR_SLOT_METRES + p.along);
    for (const boat of coastBoatPlan(slot, coast, seed)) for (const pose of samples(boat)) {
      checked++;
      for (const [x, z] of road) assert.ok(Math.hypot(pose.x - x, pose.z - z) >= ROAD, `${boat.piece} of slot ${slot} sails ${Math.hypot(pose.x - x, pose.z - z).toFixed(0)} m from the road`);
      for (const o of obstacles) {
        const dx = pose.x - o.x, dz = pose.z - o.z, cos = Math.cos(o.yaw), sin = Math.sin(o.yaw);
        assert.ok(Math.abs(dx * cos - dz * sin) >= o.hx || Math.abs(dx * sin + dz * cos) >= o.hz, `${boat.piece} of slot ${slot} (seed ${seed}) sails into a ${o.piece}`);
      }
    }
  }
  assert.ok(checked > 3000, `only ${checked} poses checked`);
});

test('a boat sails a closed loop around its anchor, bow first, floating on the sea plane', () => {
  for (let slot = 0; slot < 12; slot++) for (const boat of coastBoatPlan(slot, coast)) {
    for (const t of [0, 1.7, 33, boat.period * .25, boat.period * .5, 4000]) {
      const pose = { ...boatPose(boat, t) }, next = { ...boatPose(boat, t + .05) };
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.ok(Math.hypot(pose.x - boat.x, pose.z - boat.z) <= boat.a + 1e-6, 'inside its loop');
      const dx = next.x - pose.x, dz = next.z - pose.z, speed = Math.hypot(dx, dz) / .05;
      assert.ok(speed > .05 && speed < (boat.piece === 'motorboat' ? 14 : 3.5), `${boat.piece} at ${speed.toFixed(2)} m/s`);
      // The models point their bow along +x; a rotation about +y by yaw turns +x to (cos yaw, -sin yaw) in (x, z).
      assert.ok((dx * Math.cos(pose.yaw) - dz * Math.sin(pose.yaw)) / (speed * .05) > .98, 'bow first');
      assert.ok(Math.abs(pose.y - SEA) <= .3 * boat.scale, 'the waterline stays at the sea plane');
      assert.ok(Math.abs(pose.roll) <= .25 && Math.abs(pose.pitch) <= .08);
    }
    const start = { ...boatPose(boat, 0) }, lap = boatPose(boat, boat.period);
    assert.ok(Math.hypot(lap.x - start.x, lap.z - start.z) < 1e-6, 'the loop closes: no pop, ever');
    assert.notEqual(boatPose(boat, 1).y, boatPose(boat, 2).y, 'bobs');
  }
});

test('the boat layer draws one InstancedMesh per boat model and moves the fleet with time, never on Low', () => {
  const layer = createCoastBoatLayer(fakeGlb());
  assert.deepEqual(layer.meshes.map(mesh => mesh.name), [...COAST_BOAT_PIECES]);
  const window = coastFarWindow(300, 'high');
  layer.update(coast, 300, 'high', 0, undefined, 0);
  const plan = [];
  for (let slot = window.first; slot < window.first + window.count; slot++) plan.push(...coastBoatPlan(slot, coast));
  for (const mesh of layer.meshes) {
    assert.equal(mesh.visible, true);
    assert.equal(mesh.frustumCulled, false);
    assert.equal(mesh.castShadow, false);
    assert.equal(mesh.count, plan.filter(boat => boat.piece === mesh.name).length);
    assert.ok(mesh.count <= mesh.instanceMatrix.count, 'the pool holds the window');
  }
  const first = plan.find(boat => boat.piece === 'sailboat_a'), sloop = layer.meshes[0];
  const position = () => new THREE.Vector3().setFromMatrixPosition(matrixOf(sloop, 0));
  const at = t => { layer.update(coast, 300, 'high', 0, undefined, t); return position(); };
  const p0 = at(0), pose0 = { ...boatPose(first, 0) };
  // The fake node sits 1 m above its pivot: scaled with the boat, tipped by at most its roll.
  assert.ok(Math.hypot(p0.x - pose0.x, p0.z - pose0.z) < .6 && Math.abs(p0.y - (pose0.y + first.scale)) < .2, 'at its pose, the GLB node offset kept');
  const p9 = at(9);
  assert.ok(p0.distanceTo(p9) > 1, 'sails on');
  layer.update(coast, 300, 'high', 250, undefined, 9); // the endless floating origin
  assert.ok(Math.abs(position().z - p9.z - 250) < 1e-6);
  layer.update(coast, 300, 'low', 0, undefined, 9);
  assert.ok(layer.meshes.every(mesh => !mesh.visible), 'Low draws no boats');
  layer.update(coast, 300, 'medium', 0, undefined, 9);
  assert.ok(layer.meshes.every(mesh => mesh.visible));
  assert.ok(layer.meshes.reduce((sum, mesh) => sum + mesh.count, 0) <= plan.length, 'Medium: a shorter window');
  layer.dispose();
});

test('the Coast scenery owns the boat layer: attached boats ride the scenery group and follow the given clock', () => {
  const kit = createCoastScenery(new THREE.Scene()), clock = { value: 0 };
  const before = kit.group.children.length;
  kit.attachBoats(fakeGlb(), clock);
  const sloop = kit.group.getObjectByName('sailboat_a');
  assert.equal(kit.group.children.length, before + COAST_BOAT_PIECES.length);
  kit.update(coast, 300, 'high');
  assert.ok(sloop.visible && sloop.count > 0);
  const p0 = new THREE.Vector3().setFromMatrixPosition(matrixOf(sloop, 0));
  clock.value = 12;
  kit.update(coast, 300, 'high');
  assert.ok(p0.distanceTo(new THREE.Vector3().setFromMatrixPosition(matrixOf(sloop, 0))) > 1);
  kit.update(coast, 300, 'low');
  assert.equal(sloop.visible, false);
  kit.detachBoats();
  assert.equal(kit.group.children.length, before);
  kit.dispose();
});
