import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCorridorHeight, createFrostbiteRaceScene, ROAD_HALF } from '../src/frostbite-race-scene.ts';
import { FROSTBITE_TRACK, frostbiteFrame, frostbiteLeg } from '../src/courses/frostbite-race.ts';
import { SHORTCUT_HALF_WIDTH, SHORTCUT_TOLERANCE } from '../src/game.js';

// The three graph decisions are raced as flight corridors; each must be drawn as a real structure, not a flat lane strip.
const race = createFrostbiteRaceScene(new THREE.Scene());
race.group.updateMatrixWorld(true);
const height = createCorridorHeight();
const sections = FROSTBITE_TRACK.sections.filter(s => s.type === 'shortcut');
const STYLE = { 'glacier-valley': 'glacier-ridge', 'rift-lower-canyon': 'rift-ice-bridge', 'aurora-basin': 'aurora-span' };
const find = (root, name) => { const out = []; root.traverse(o => { if (o.name === name) out.push(o); }); return out; };
const lane = (s, lateral, lift = 0) => {
  const f = frostbiteFrame(s);
  return new THREE.Vector3(f.point.x + f.right[0] * lateral, f.point.y + lift, f.point.z + f.right[2] * lateral);
};
const up = new THREE.Vector3(0, 1, 0), down = new THREE.Vector3(0, -1, 0);
const route = [];
for (let s = 0; s <= FROSTBITE_TRACK.length; s += 4) route.push(frostbiteFrame(s).point);
const roadGap = (x, z) => Math.min(...route.map(p => Math.hypot(p.x - x, p.z - z)));

test('each decision has its own named structure: glacier ridge, Rift ice bridge, aurora span', () => {
  assert.deepEqual(sections.map(s => STYLE[frostbiteLeg((s.from + s.to) / 2).edgeId]), ['glacier-ridge', 'rift-ice-bridge', 'aurora-span']);
  for (const name of Object.values(STYLE)) assert.equal(find(race.group, name).length, 1, name);
});

test('the deck is a slab with a real underside a car on the lower road can pass beneath', () => {
  const decks = find(race.group, 'shortcut-ice-decks');
  assert.equal(decks.length, sections.length);
  for (const s of sections) for (let d = s.from + 20; d < s.to - 20; d += 37) {
    const top = s.altitude - SHORTCUT_TOLERANCE;
    const below = new THREE.Raycaster(lane(d, s.x, .05), up, 0, top).intersectObjects(decks)[0];
    assert.ok(below, `no underside at ${d}`);
    const lift = below.point.y - frostbiteFrame(d).point.y;
    assert.ok(lift > 2.8 && lift < top - .2, `underside ${lift.toFixed(2)} m at ${d}`);
  }
});

test('nothing hangs into the 2.8 m car envelope over the drivable road under any structure', () => {
  const parts = Object.values(STYLE).flatMap(name => find(race.group, name));
  let hits = 0;
  for (const s of sections) for (let d = s.from; d <= s.to; d += 5) for (let lateral = -ROAD_HALF; lateral <= ROAD_HALF; lateral += 1.5)
    if (new THREE.Raycaster(lane(d, lateral, .05), up, 0, 2.75).intersectObjects(parts, true)[0]) hits++;
  assert.equal(hits, 0);
});

test('supports stand on the canyon floor, clear of every road, and reach up to the deck', () => {
  for (const [edge, name] of Object.entries(STYLE)) {
    const s = sections.find(x => frostbiteLeg((x.from + x.to) / 2).edgeId === edge);
    const [supports] = find(find(race.group, name)[0], 'structure-supports');
    assert.ok(supports instanceof THREE.InstancedMesh && supports.count >= (s.to - s.from) / 45, `${name}: ${supports?.count} supports`);
    supports.geometry.computeBoundingBox();
    const m = new THREE.Matrix4(), box = new THREE.Box3();
    for (let i = 0; i < supports.count; i++) {
      supports.getMatrixAt(i, m); box.copy(supports.geometry.boundingBox).applyMatrix4(m);
      const c = box.getCenter(new THREE.Vector3()), ground = height(c.x, c.z);
      const radius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
      assert.ok(roadGap(c.x, c.z) - radius > ROAD_HALF, `${name} support ${i} stands on a road`);
      assert.ok(box.min.y <= ground + .05, `${name} support ${i} floats ${(box.min.y - ground).toFixed(2)} m`);
      assert.ok(box.max.y >= frostbiteFrame(s.from).point.y - 40 && box.max.y - ground > 2.5, `${name} support ${i} too short`);
    }
  }
});

test('both deck edges carry a visible curb with warm hazard posts', () => {
  for (const name of Object.values(STYLE)) {
    const root = find(race.group, name)[0];
    const [rails] = find(root, 'structure-rails'), [posts] = find(root, 'hazard-posts');
    assert.ok(rails && posts?.count >= 8, name);
    const s = sections.find(x => STYLE[frostbiteLeg((x.from + x.to) / 2).edgeId] === name), d = (s.from + s.to) / 2;
    for (const side of [-1, 1]) {
      const edge = s.x + side * (SHORTCUT_HALF_WIDTH + .1);
      const hit = new THREE.Raycaster(lane(d, edge, 30), down).intersectObject(rails)[0];
      assert.ok(hit && hit.point.y > lane(d, 0, s.altitude - SHORTCUT_TOLERANCE).y, `${name} curb side ${side}`);
    }
  }
});

test('the aurora span rises on towers with cables; the ridge and bridge keep distinct supports', () => {
  const span = find(race.group, 'aurora-span')[0];
  assert.equal(find(span, 'span-cables').length, 1);
  const tops = Object.values(STYLE).map(name => { const [s] = find(find(race.group, name)[0], 'structure-supports'); s.geometry.computeBoundingBox(); return s.geometry; });
  assert.notEqual(tops[0], tops[1]);
  assert.notEqual(tops[1], tops[2]);
  const [towers] = find(span, 'structure-supports'), m = new THREE.Matrix4(), box = new THREE.Box3();
  towers.getMatrixAt(0, m); box.copy(towers.geometry.boundingBox).applyMatrix4(m);
  assert.ok(box.max.y - height(box.getCenter(new THREE.Vector3()).x, box.getCenter(new THREE.Vector3()).z) > 10, 'span towers rise above the deck');
});
