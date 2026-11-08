import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCourseRaceScene } from '../src/course-race-scene.ts';
import { SKYFALL_ARCHIPELAGO_RACE } from '../src/courses/skyfall-archipelago-race.ts';
import { RACE_DRIVER_IDS } from '../src/race-grid.ts';

function fixture() {
  const graph = SKYFALL_ARCHIPELAGO_RACE.graph;
  const path = graph.groundRoute;
  const cars = new Map(RACE_DRIVER_IDS.map((id, index) =>
    [id, { travel: { currentEdgeId: path[index % path.length], localS: 120 } }]));
  return { trackId: 'skyfall-archipelago', elapsed: 2,
    course: { spec: SKYFALL_ARCHIPELAGO_RACE, cars } };
}

test('Skyfall streams real physical road for all eight cars in the shared CourseGraph scene', () => {
  const scene = new THREE.Scene(), host = createCourseRaceScene(scene), race = fixture();
  host.update(race, 'medium');
  const root = scene.getObjectByName('CourseGraph race scenery');
  assert.ok(root?.visible);
  const world = root.getObjectByName('Skyfall playable world');
  assert.ok(world, 'Skyfall runtime must attach its existing physical road and floating islands');
  const chunks = world.children.filter(child => child.name.startsWith('Skyfall streamed chunk '));
  assert.ok(chunks.length >= 4, 'several 8-car edge windows stream without a second renderer');
  const before = new Set(chunks.map(chunk => chunk.name));
  for (const car of race.course.cars.values()) {
    car.travel.currentEdgeId = race.course.spec.graph.groundRoute.at(-1);
    car.travel.localS = 1000;
  }
  host.update(race, 'medium', 3);
  const after = world.children.filter(child => child.name.startsWith('Skyfall streamed chunk '));
  assert.ok(after.length > 0, 'destination edge streams');
  assert.ok(after.some(chunk => !before.has(chunk.name)), 'old chunks are replaced after the fleet moves');
  host.hide();
  assert.equal(root.children.length, 0, 'switching back to a classic race releases Skyfall GPU resources');
  assert.equal(root.visible, false);
  host.dispose();
  assert.equal(scene.getObjectByName('CourseGraph race scenery'), undefined);
});

test('Skyfall rebuilds on quality change but never builds on a classic track', () => {
  const scene = new THREE.Scene(), host = createCourseRaceScene(scene), race = fixture();
  host.update(race, 'low');
  const root = scene.getObjectByName('CourseGraph race scenery');
  const first = root.getObjectByName('Skyfall playable world');
  assert.ok(first);
  host.update(race, 'high');
  assert.notEqual(root.getObjectByName('Skyfall playable world'), first);
  host.update({ trackId: 'coast' }, 'high');
  assert.equal(root.children.length, 0);
  host.dispose();
});
