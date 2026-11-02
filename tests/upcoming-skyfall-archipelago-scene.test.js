import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUpcomingEnvironment } from '../src/upcoming-scenes/skyfall-archipelago.ts';

const create = () => {
  const scene = new THREE.Scene();
  return { scene, ...createUpcomingEnvironment(scene) };
};
const named = (group, name) => {
  const object = group.getObjectByName(name);
  assert.ok(object, 'missing 3D landmark: ' + name);
  return object;
};

test('Skyfall owns actual 3D archipelago, road, bridge, rings and separated air route', () => {
  const { scene, group, dispose } = create();
  assert.ok(scene.children.includes(group));
  assert.ok(group.children.filter(o => o.name.startsWith('Skyfall island')).length >= 6);
  const road = named(group, 'Skyfall ground road');
  const air = named(group, 'Skyfall elevated flight route');
  named(group, 'Skyfall stone bridges');
  named(group, 'Skyfall giant stone ring');
  named(group, 'Skyfall waterfalls');
  named(group, 'Skyfall near cloud ocean');
  assert.ok(road.isMesh && air.isMesh, 'routes are real Three.js meshes');
  const ground = new THREE.Box3().setFromObject(road);
  const elevated = new THREE.Box3().setFromObject(air);
  assert.ok(ground.max.z >= 44 && ground.min.z <= -179, 'ground route spans the showroom');
  assert.ok(ground.min.y > -3 && ground.max.y < 3, 'vehicle anchor is road Y≈0');
  assert.ok(elevated.max.y > 15, 'shortcut visibly flies above the ground route');
  assert.ok(elevated.min.y < 1, 'shortcut reconnects at the lower road');
  dispose();
  assert.ok(!scene.children.includes(group));
});

test('clouds and vegetation reuse instanced meshes; decorative motion respects quality', () => {
  const { group, update, dispose } = create();
  const near = named(group, 'Skyfall near cloud ocean');
  const far = named(group, 'Skyfall distant cloud ocean');
  const trees = named(group, 'Skyfall treetops');
  const motes = named(group, 'Skyfall light motes');
  assert.ok(near.isInstancedMesh && far.isInstancedMesh && trees.isInstancedMesh);
  assert.ok(near.count > 50 && far.count > 20);
  update(0, 'high', false);
  const initial = near.position.x;
  update(31, 'high', false);
  assert.notEqual(near.position.x, initial, 'cloud ocean drifts with time');
  assert.equal(far.visible, true);
  assert.equal(motes.visible, true);
  update(31, 'low', false);
  assert.equal(near.visible, true, 'low retains the readable cloud setting');
  assert.equal(far.visible, false, 'low suppresses distant transparent overdraw');
  assert.equal(motes.visible, false, 'low disables light particles');
  update(31, 'medium', false);
  assert.equal(far.visible, true);
  assert.equal(motes.visible, true);
  dispose();
});

test('waterfall and particle animation is deterministic, frozen for reduced motion', () => {
  const { group, update, dispose } = create();
  const falling = named(group, 'Skyfall waterfall droplets');
  const positions = falling.geometry.getAttribute('position');
  update(2, 'high', false);
  const a = Array.from(positions.array);
  update(14, 'high', false);
  const b = Array.from(positions.array);
  assert.notDeepEqual(a, b, 'falling droplets change position');
  update(14, 'high', false);
  assert.deepEqual(Array.from(positions.array), b, 'same time produces identical positions');
  update(63, 'high', true);
  const frozen = Array.from(positions.array);
  update(125, 'low', true);
  assert.deepEqual(Array.from(positions.array), frozen, 'reduced motion freezes at authored rest pose');
  assert.equal(named(group, 'Skyfall light motes').visible, false);
  dispose();
});

test('disposal removes the group and frees each owned geometry and material once', () => {
  const { scene, group, update, dispose } = create();
  const resources = new Set();
  group.traverse(o => {
    if (o.geometry) resources.add(o.geometry);
    if (o.material) for (const material of [].concat(o.material)) resources.add(material);
  });
  assert.ok(resources.size > 10);
  let count = 0;
  for (const resource of resources) {
    const original = resource.dispose.bind(resource);
    resource.dispose = () => { count++; original(); };
  }
  dispose();
  dispose();
  update(8, 'high', false);
  assert.equal(count, resources.size, 'all GPU resources disposed exactly once');
  assert.ok(!scene.children.includes(group));
});
