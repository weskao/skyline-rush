import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RACE_DRIVER_IDS } from '../src/race-grid.ts';
import { DUNE_TEMPEST_RACE } from '../src/courses/dune-tempest-race.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { createCourseRaceScene } from '../src/course-race-scene.ts';

const graph = DUNE_TEMPEST_RACE.graph;
const groups = [graph.groundRoute[0], graph.groundRoute[3], graph.groundRoute[7]];
function fixture() {
  const cars = new Map(RACE_DRIVER_IDS.map((id, i) => {
    const edgeId = groups[i % groups.length];
    return [id, { travel: { currentEdgeId: edgeId, localS: Math.min(110 + i * 13, routeLength(graph, edgeId) - 10) } }];
  }));
  return { trackId: 'dune-tempest', elapsed: 1, course: { spec: DUNE_TEMPEST_RACE, cars } };
}
function geometries(group) {
  const result = new Set();
  group.traverse(node => { if (node.geometry) result.add(node.geometry); });
  return result;
}

test('one Three.js scene host streams road/terrain around eight cars and clears old chunks', () => {
  const scene = new THREE.Scene(), host = createCourseRaceScene(scene), race = fixture();
  host.update(race, 'low');
  const root = scene.getObjectByName('CourseGraph race scenery');
  assert.ok(root);
  assert.ok(root.visible);
  assert.ok(root.children.length >= groups.length, 'multiple live edges have chunks');
  for (const edgeId of groups) assert.ok(root.children.some(chunk => chunk.name === 'Dune chunk ' + edgeId));
  const oldGeometries = geometries(root);
  assert.ok(oldGeometries.size > 0);
  const disposal = new Map();
  for (const geometry of oldGeometries) {
    const original = geometry.dispose.bind(geometry);
    geometry.dispose = () => { disposal.set(geometry, (disposal.get(geometry) ?? 0) + 1); original(); };
  }
  for (const car of race.course.cars.values()) {
    car.travel.currentEdgeId = 'canyon-switchbacks';
    car.travel.localS = 3100;
  }
  host.update(race, 'low');
  assert.ok(root.children.length > 0);
  for (const geometry of oldGeometries) assert.equal(disposal.get(geometry), 1, 'stale geometry disposed once');
  host.hide();
  assert.equal(root.children.length, 0, 'switching to Coast removes graph road from renderer');
  assert.equal(root.visible, false);
  host.update(race, 'low');
  assert.ok(root.children.length > 0, 'returning to Dune rebuilds its own chunks');
  host.dispose();
  assert.equal(scene.getObjectByName('CourseGraph race scenery'), undefined);
});

test('same car positions reuse chunks; quality changes release previous buffers', () => {
  const scene = new THREE.Scene(), host = createCourseRaceScene(scene), race = fixture();
  host.update(race, 'low');
  const root = scene.getObjectByName('CourseGraph race scenery');
  const first = [...root.children];
  host.update(race, 'low', 2);
  assert.deepEqual(root.children, first, 'no per-frame scene rebuild');
  host.update(race, 'high', 3);
  assert.ok(root.children.every(chunk => !first.includes(chunk)), 'quality rebuild is explicit');
  host.dispose();
});

test('classic race never creates CourseGraph scenery', () => {
  const scene = new THREE.Scene(), host = createCourseRaceScene(scene);
  host.update({ trackId: 'coast' }, 'high');
  const root = scene.getObjectByName('CourseGraph race scenery');
  assert.equal(root.children.length, 0);
  host.dispose();
});
