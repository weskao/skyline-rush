import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MONSOON_RUINS_COURSE, sampleMonsoonRoute } from '../src/courses/monsoon-ruins.ts';
import { createMonsoonRuinsChunk } from '../src/courses/monsoon-ruins-scene.ts';

const find = (group, name) => {
  let found;
  group.traverse(node => { if (node.name === name) found = node; });
  return found;
};
const mount = (from, to, edgeId = 'ground', quality = 'medium') => {
  const scene = new THREE.Scene();
  const chunk = createMonsoonRuinsChunk({ from, to, edgeId, quality });
  scene.add(chunk.group);
  return { scene, chunk };
};

test('mud road and sculpted layered jungle terrain stream in independent ground chunks', () => {
  const { scene, chunk } = mount(1050, 1300, 'ground', 'low');
  assert.ok(find(chunk.group, 'monsoon-course-mud-road'));
  assert.ok(find(chunk.group, 'monsoon-jungle-river-valley-terrain'));
  assert.ok(find(chunk.group, 'monsoon-mixed-rainforest-canopy'));
  assert.ok(find(chunk.group, 'solid-fallen-trunk-1'), 'draw the same physical prop as collision');
  assert.ok(find(chunk.group, 'monsoon-animated-rain'));
  const road = find(chunk.group, 'monsoon-course-mud-road');
  assert.ok(road.geometry.getAttribute('position').count > 30);
  chunk.dispose();
  assert.equal(scene.children.length, 0, 'dispose detaches chunk from host');
  chunk.dispose();
});

test('guardian face and temple have authored three-dimensional meshes', () => {
  const { chunk } = mount(5210, 5450);
  for (const key of ['monsoon-colossal-guardian-temple', 'colossal-ancient-guardian-face',
    'moss-covered stepped sanctuary', 'carved temple pillar']) {
    assert.ok(find(chunk.group, key), key);
  }
  chunk.dispose();
});

test('waterfall visuals occupy the actual river location and animate without new canvases', () => {
  const { chunk } = mount(6660, 6850, 'ground', 'high');
  const falls = find(chunk.group, 'monsoon-river-gorge-triple-waterfall');
  const water = find(chunk.group, 'animated-waterfall-cascade');
  assert.ok(falls && water);
  const frame = sampleMonsoonRoute('ground', 6740);
  const landmark = MONSOON_RUINS_COURSE.landmarks.find(x => x.id === 'triple-waterfall');
  const expected = new THREE.Vector3(...frame.point).addScaledVector(
    new THREE.Vector3(...frame.right), landmark.lateral,
  );
  assert.ok(water.position.distanceTo(expected) < 40, 'animated falls must not be at origin');
  const before = water.position.y;
  chunk.update(10, false);
  assert.notEqual(water.position.y, before, 'time-driven waterfall');
  chunk.dispose();
});

test('flight stone bridge has physical vertical deck and visible obstacles', () => {
  const edge = MONSOON_RUINS_COURSE.branches.find(e => e.id === 'waterfall-skybridge');
  const { chunk } = mount(6810, 7070, edge.id);
  assert.ok(find(chunk.group, 'monsoon-course-waterfall-skybridge'));
  assert.ok(find(chunk.group, 'solid-fallen-pier'));
  chunk.dispose();
});

test('rain/fern animation respects reduced motion and all scene-owned resources release', () => {
  const { scene, chunk } = mount(11100, 11300, 'ground', 'medium');
  const rain = find(chunk.group, 'monsoon-animated-rain');
  const fern = find(chunk.group, 'monsoon-wind-swaying-fern');
  const dropArray = rain.geometry.getAttribute('position').array;
  const before = dropArray[1];
  chunk.update(3, false);
  assert.notEqual(dropArray[1], before);
  assert.ok(rain.visible);
  chunk.update(8, true);
  assert.equal(rain.visible, false);
  assert.equal(fern.rotation.z, 0);
  const mesh = find(chunk.group, 'monsoon-course-mud-road');
  let disposed = 0;
  mesh.geometry.addEventListener('dispose', () => disposed++);
  chunk.dispose();
  assert.equal(disposed, 1);
  assert.equal(scene.children.length, 0);
});
