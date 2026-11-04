import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MONSOON_RUINS_COURSE, sampleMonsoonRoute, monsoonWetContact, monsoonTerrainHeight } from '../src/courses/monsoon-ruins.ts';
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
  for (const key of ['guardian-brow', 'guardian-nose', 'guardian-mouth', 'guardian-stone-headdress']) {
    assert.ok(find(chunk.group, key), key + ' should articulate the face silhouette');
  }
  chunk.dispose();
});

test('guardian, falls and instanced tree roots sit on physical authored terrain', () => {
  const temple = mount(5210, 5450, 'ground', 'medium');
  const sanctuary = find(temple.chunk.group, 'monsoon-colossal-guardian-temple');
  const roadAtTemple = sampleMonsoonRoute('ground', 5300).point[1];
  assert.ok(sanctuary.position.y - roadAtTemple > 8,
    'guardian base cannot be buried below raised valley terrain');
  assert.ok(Math.abs(sanctuary.position.y - monsoonTerrainHeight(5300, -135)) < .01);
  temple.chunk.dispose();

  const waterfall = mount(6660, 6850, 'ground', 'medium');
  const falls = find(waterfall.chunk.group, 'monsoon-river-gorge-triple-waterfall');
  const roadAtFalls = sampleMonsoonRoute('ground', 6740).point[1];
  assert.ok(falls.position.y - roadAtFalls > 8, 'falls basin must rest on raised terrain');
  assert.ok(Math.abs(falls.position.y - monsoonTerrainHeight(6740, 115)) < .01);
  waterfall.chunk.dispose();

  const from = 1050, to = 1300, forest = mount(from, to, 'ground', 'medium');
  const trunk = find(forest.chunk.group, 'monsoon-mixed-rainforest-canopy');
  const matrix = new THREE.Matrix4();
  trunk.getMatrixAt(0, matrix);
  const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  matrix.decompose(position, rotation, scale);
  const seed = n => { const x = Math.sin(n * 127.1 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const key = Math.floor(from / 17) * 241;
  const s = from + (to - from) * seed(key * 7);
  const lateral = -(27 + seed(key + 18) * 145);
  const baseY = position.y - scale.y / 2;
  assert.ok(baseY - sampleMonsoonRoute('ground', s).point[1] > 3,
    'trunk roots must not remain at road elevation when the terrain rises');
  assert.ok(Math.abs(baseY - monsoonTerrainHeight(s, lateral)) < .01,
    'instanced trunk base must touch authored terrain');
  forest.chunk.dispose();
});

test('terrain mesh vertices match the exported ground contact-height sampler', () => {
  const from = 1050, to = 1300;
  const { chunk } = mount(from, to, 'ground', 'low');
  const positions = find(chunk.group, 'monsoon-jungle-river-valley-terrain').geometry.getAttribute('position');
  const rows = Math.ceil((to - from) / 15);
  for (const row of [0, Math.floor(rows / 2), rows]) {
    const s = from + (to - from) * row / rows;
    for (const col of [0, 3, 6, 9]) {
      const expected = monsoonTerrainHeight(s, -(13.5 + col * 19));
      assert.ok(Math.abs(positions.getY(row * 10 + col) - expected) < .01,
        `off-road mesh/contact separation at ${s}m / column ${col}`);
    }
  }
  assert.throws(() => monsoonTerrainHeight(100, 190), /bounds/i);
  chunk.dispose();
});

test('river valley has an actual visible watercourse and not only colored terrain', () => {
  const { chunk } = mount(3100, 3300);
  const river = find(chunk.group, 'monsoon-running-river');
  assert.ok(river);
  assert.ok(river.geometry.getAttribute('position').count > 20);
  assert.ok(river.material.transparent);
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


test('ford has a physical visible water layer separate from the mud driving surface', () => {
  const { chunk } = mount(3150, 3300, 'river-ford');
  assert.ok(find(chunk.group, 'monsoon-course-river-ford'));
  assert.ok(find(chunk.group, 'monsoon-shallow-river-ford'));
  chunk.dispose();
});

test('river ford water mesh follows the shared physical contact depth along the road', () => {
  const from = 3150, to = 3300;
  const { chunk } = mount(from, to, 'river-ford');
  const road = find(chunk.group, 'monsoon-course-river-ford').geometry.getAttribute('position');
  const water = find(chunk.group, 'monsoon-shallow-river-ford').geometry.getAttribute('position');
  assert.equal(water.count, road.count);
  for (let i = 0; i < road.count; i += 2) {
    const s = from + (to - from) * (i / 2) / (road.count / 2 - 1);
    const visibleDepth = water.getY(i) - road.getY(i) - .005;
    assert.ok(Math.abs(visibleDepth - monsoonWetContact('river-ford', s).depth) < .003,
      `water/physics mismatch at ${s}: ${visibleDepth}`);
  }
  chunk.dispose();
});

test('flight stone bridge has physical vertical deck and visible obstacles', () => {
  const edge = MONSOON_RUINS_COURSE.branches.find(e => e.id === 'waterfall-skybridge');
  const { chunk } = mount(6810, 7070, edge.id);
  assert.ok(find(chunk.group, 'monsoon-course-waterfall-skybridge'));
  assert.ok(find(chunk.group, 'solid-fallen-pier'));
  assert.ok(find(chunk.group, 'monsoon-bridge-support-pier'));
  chunk.dispose();
});

test('viaduct structural deck follows the real high-route crossing, not an offset decorative platform', () => {
  const { chunk } = mount(6840, 7050, 'ground');
  const deck = find(chunk.group, 'elevated-bridge-deck');
  assert.ok(deck);
  const route = sampleMonsoonRoute('waterfall-skybridge', 6950);
  const centre = deck.getWorldPosition(new THREE.Vector3());
  assert.ok(centre.distanceTo(new THREE.Vector3(...route.point)) < 2,
    'decorative bridge deck must sit immediately beneath the sampled route');
  const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(
    deck.getWorldQuaternion(new THREE.Quaternion()),
  );
  const heading = new THREE.Vector3(...route.forward).setY(0).normalize();
  assert.ok(axis.dot(heading) > 0.95, 'deck must face the actual route tangent');
  chunk.dispose();
});

test('forest and rain budgets scale with streamed metres, rather than number of chunks', () => {
  const big = mount(1050, 1300, 'ground', 'high');
  const left = mount(1050, 1150, 'ground', 'high');
  const right = mount(1150, 1300, 'ground', 'high');
  const trees = ({ chunk }) => find(chunk.group, 'monsoon-mixed-rainforest-canopy').count;
  const drops = ({ chunk }) =>
    find(chunk.group, 'monsoon-animated-rain').geometry.getAttribute('position').count;
  assert.equal(trees(left) + trees(right), trees(big),
    'subdividing a chunk must not double foliage instances');
  assert.equal(drops(left) + drops(right), drops(big),
    'subdividing a chunk must not double rain draw workload');
  [big, left, right].forEach(({ chunk }) => chunk.dispose());
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
