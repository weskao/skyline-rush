// Guards for .claude/rules/road-runout.md: on every open road the car parks at the finish with road running on
// ahead of it, never a deck ending in the air under it. One test per open road; Sky Spiral lives in
// tests/sky-scene-streaming.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorldTourScene } from '../src/world-tour-scene.js';
import { RACE_TRACKS } from '../src/game.js';
import { trackLocalPosition } from '../src/track-paths.ts';
import { createFrostbiteRaceScene } from '../src/frostbite-race-scene.ts';
import { FROSTBITE_TRACK, frostbiteFrame } from '../src/courses/frostbite-race.ts';
import { createStormlineRaceScene } from '../src/stormline-megacity-race-scene.ts';
import { STORMLINE_TRACK, stormlineFrame } from '../src/courses/stormline-megacity-race.ts';
import { createVolcanicCrownRaceScene } from '../src/volcanic-crown-race-scene.ts';
import { VOLCANIC_TRACK, volcanicFrame } from '../src/courses/volcanic-crown-race.ts';

const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < .01, `${label}: ${actual} ≈ ${expected}`);
const matrix = new THREE.Matrix4(), at = new THREE.Vector3();
const down = new THREE.Vector3(0, -1, 0);
const shown = object => { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; };
// The drawn road under each lane, every 100 m along `frameAt` up to `reach` metres past the finish, in world space.
function assertRoadAhead(label, roads, frameAt, finish, reach) {
  for (let k = 50; k <= reach; k += 100) for (const lateral of [-10, 0, 10]) {
    const f = frameAt(finish + k), x = f.point.x + f.right[0] * lateral, z = f.point.z + f.right[2] * lateral;
    const hit = new THREE.Raycaster(new THREE.Vector3(x, f.point.y + 30, z), down).intersectObjects(roads)
      .find(h => shown(h.object) && Math.abs(h.point.y - f.point.y) < 1);
    assert.ok(hit, `${label}: drawn road ${k} m past the finish, lane ${lateral}`);
  }
}
// Past the end, the road runs straight on along its last heading and grade, offset by the scene's origin.
const straightOn = (end, from, origin) => s => ({ ...end, point: {
  x: end.point.x + end.forward[0] * (s - from) + origin.x,
  y: end.point.y + end.forward[1] * (s - from) + origin.y,
  z: end.point.z + end.forward[2] * (s - from) + origin.z,
} });
const instanceAt = (mesh, index) => { mesh.getMatrixAt(index, matrix); return at.setFromMatrixPosition(matrix).clone(); };

test('World Tour roads run on past the finish under the parked car', () => {
  const scene = new THREE.Scene(), tour = createWorldTourScene(scene);
  const group = scene.getObjectByName('World Tour authored scenery');
  const layer = scene.getObjectByName('Distance-anchored continuous scenery');
  const road = group.children.find(o => o.isMesh && o.geometry.attributes.position?.count === 139 * 2);
  const rails = group.children.filter(o => o.isInstancedMesh && o.count === 138 * 2); // edges and shoulders
  assert.equal(rails.length, 2);
  for (const id of ['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic']) {
    const length = RACE_TRACKS[id].length;
    tour.update(id, length, 'high'); // a finite race: the car is parked on the finish line
    const origin = Math.floor(length / 12) * 12, start = origin - 160, last = 138;
    const positions = road.geometry.attributes.position;
    for (const side of [0, 1]) {
      const expected = trackLocalPosition(id, start + last * 12, side ? 12 : -12, 0, origin, true);
      near(positions.getX(last * 2 + side), expected[0], `${id} last row x`);
      near(positions.getZ(last * 2 + side), expected[2], `${id} last row z`);
    }
    // Straight-line metres from the parked car; the last row sits ~1490 m along a curving road.
    const ahead = (x, z) => Math.hypot(x + group.position.x, z + group.position.z);
    const reach = ahead(positions.getX(last * 2), positions.getZ(last * 2));
    assert.ok(reach > 1000, `${id}: the deck reaches ${reach.toFixed(0)} m past the finish`);
    for (const mesh of rails) {
      const tail = instanceAt(mesh, (last - 1) * 2);
      assert.ok(ahead(tail.x, tail.z) > 1000, `${id}: rails and shoulders run on with the deck`);
    }
    const index = road.geometry.index;
    for (let row = Math.ceil((length - start) / 12); row < last; row++) {
      assert.notEqual(index.getX(row * 6), index.getX(row * 6 + 1), `${id} row ${row} past the finish is drawn`);
    }
    const beyond = layer.children.filter(c => c.name.startsWith(`world-tour-${id}-chunk-`) && c.userData.chunkIndex * 120 > length);
    assert.ok(beyond.length >= 5, `${id}: the roadside scenery runs on with the road (${beyond.length} chunks)`);
  }
});

test('Frostbite road runs on past the finish for the whole view radius', () => {
  const scene = new THREE.Scene(), race = createFrostbiteRaceScene(scene), length = FROSTBITE_TRACK.length;
  race.update(length);
  race.group.updateMatrixWorld(true);
  const roads = [];
  race.group.traverse(o => { if (o.name === 'race-road') roads.push(o); });
  const local = straightOn(frostbiteFrame(length), length, race.group.position);
  assertRoadAhead('frostbite', roads, local, length, 1500);
  race.dispose();
});

// Measured courses: the drawn road stops where the last ground edge ends (CourseGraph frames clamp there).
for (const [label, create, track, frameAt] of [
  ['stormline', createStormlineRaceScene, STORMLINE_TRACK, stormlineFrame],
  ['volcanic', createVolcanicCrownRaceScene, VOLCANIC_TRACK, volcanicFrame],
]) test(`${label} road runs on past the finish for the whole view radius`, () => {
  const race = create(new THREE.Scene()), length = track.length;
  race.update(length);
  race.group.updateMatrixWorld(true);
  const roads = [];
  race.group.traverse(o => { if (o.isMesh && o.name !== 'city-floor') roads.push(o); });
  const end = track.length + 1; // the last edge's end: track.length is its whole metres
  assertRoadAhead(label, roads, straightOn(frameAt(end), end, race.group.position), end, 1500);
  race.dispose();
});
