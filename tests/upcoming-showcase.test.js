import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUpcomingShowcase } from '../src/upcoming-showcase.ts';
import { previewPlayer } from '../src/track-preview.ts';

const id = 'dune-tempest';

test('missing environment never presents a fake live Three.js showcase', () => {
  const showcase = createUpcomingShowcase({}, new THREE.Texture(), new THREE.Texture());
  assert.equal(showcase.setTrack(id), false);
  assert.equal(showcase.scene, null);
  showcase.dispose();
});

test('showcase reuses its two most recent 3D scenes and disposes them when the host exits', () => {
  const released = [];
  const updates = [], built = [];
  const create = name => scene => {
    built.push(name);
    const group = new THREE.Group();
    group.name = name;
    scene.add(group);
    return {
      group,
      update: (time, quality, reducedMotion) => updates.push({ name, time, quality, reducedMotion }),
      dispose: () => released.push(name),
    };
  };
  const showcase = createUpcomingShowcase({
    'dune-tempest': create('dune'),
    'monsoon-ruins': create('monsoon'),
  }, new THREE.Texture(), new THREE.Texture());
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, .1, 2000);
  assert.equal(showcase.setTrack('dune-tempest'), true);
  assert.ok(showcase.scene instanceof THREE.Scene);
  showcase.update(camera, 2, { quality: 'low', view: 'drive', enabled: true, airflow: false }, true);
  assert.deepEqual(updates, [{ name: 'dune', time: 2, quality: 'low', reducedMotion: true }]);
  const originalScene = showcase.scene;
  assert.equal(showcase.setTrack('monsoon-ruins'), true);
  assert.deepEqual(released, [], 'switching must not dispose a preview needed for swipe snapshots');
  assert.equal(showcase.setTrack('dune-tempest'), true);
  assert.equal(showcase.scene, originalScene, 'returning uses the same 3D scene and models');
  assert.deepEqual(built, ['dune', 'monsoon'], 'no rebuild on a return swipe');
  assert.equal(showcase.setTrack(null), false);
  assert.equal(showcase.scene, null);
  assert.deepEqual(released, [], 'classic preview hides the stage without destroying the cache');
  showcase.dispose();
  showcase.dispose();
  assert.deepEqual(released.sort(), ['dune', 'monsoon'], 'every cached stage disposed exactly once');
});

test('every upcoming map reuses the shared Roadster AIRFLOW ground/hover pose and camera', () => {
  const ids = [
    'dune-tempest', 'monsoon-ruins', 'skyfall-archipelago',
    'volcanic-crown', 'stormline-megacity', 'frostbite-canyon',
  ];
  const factories = Object.fromEntries(ids.map(id => [id, scene => {
    const group = new THREE.Group();
    scene.add(group);
    return { group, update() {}, dispose() {} };
  }]));
  const showcase = createUpcomingShowcase(factories, new THREE.Texture(), new THREE.Texture());
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, .1, 2000);

  for (const id of ids) {
    assert.equal(showcase.setTrack(id), true);
    const cars = showcase.scene.children.filter(child => child.userData?.jets);
    assert.equal(cars.length, 4, id + ' uses the same shared four-car presentation');
    const player = cars[0];

    showcase.update(camera, 3, { quality: 'low', view: 'drive', enabled: true, airflow: false }, false);
    const expectedHover = previewPlayer(id, {}, 3, false, false);
    assert.ok(Math.abs(player.position.y - expectedHover.altitude) < 1e-6, id + ' hovering pose');
    assert.equal(player.userData.jets.visible, true, id + ' hovering jets');
    assert.equal(camera.fov, 50);

    showcase.update(camera, 3.1, { quality: 'low', view: 'drive', enabled: true, airflow: true }, false);
    assert.ok(Math.abs(player.position.y - .06) < 1e-6, id + ' grounded wheel clearance');
    assert.equal(player.userData.jets.visible, false, id + ' landing hides hover jets');

    showcase.update(camera, 3.2, { quality: 'low', view: 'drive', enabled: true, airflow: false }, true);
    assert.ok(Math.abs(player.position.y - 1.6) < 1e-6, id + ' Reduced Motion hover is still present');
    assert.equal(player.userData.jets.visible, false, id + ' Reduced Motion disables jets');
  }
  showcase.dispose();
});

test('Task 4b: the Coming Soon player car is a stable model host, released before its stage is disposed', () => {
  const released = [];
  const env = scene => { const group = new THREE.Group(); scene.add(group); return { group, update() {}, dispose() {} }; };
  const showcase = createUpcomingShowcase({ 'dune-tempest': env, 'monsoon-ruins': env, 'skyfall-archipelago': env }, new THREE.Texture(), new THREE.Texture(),
    host => released.push({ host, attached: !!host.car.parent }));
  assert.equal(showcase.modelHost, null);
  showcase.setTrack('dune-tempest');
  const first = showcase.modelHost;
  assert.equal(first.name, 'showcase');
  assert.equal(first.scene, showcase.scene);
  assert.equal(first.car.parent, showcase.scene);
  assert.ok(first.car.userData.jets && first.car.userData.wing, 'the shared procedural Roadster');
  assert.equal(first.keep.parent, first.car, 'aero VFX rides on the car and stays drawn');
  assert.equal(showcase.modelHost, first, 'same object every frame');
  showcase.setTrack('monsoon-ruins');
  assert.deepEqual(released, [], 'the old model is retained for the next preview swipe');
  assert.notEqual(showcase.modelHost, first);
  showcase.setTrack('skyfall-archipelago');
  assert.deepEqual(released, [{ host: first, attached: true }], 'LRU eviction releases the old model before disposal');
  showcase.dispose();
  assert.equal(released.length, 3);
});

// The cache may never retain an unlimited number of GPU scene graphs.
test('preview stage LRU evicts the oldest scene, not the currently displayed track', () => {
  const created = [], released = [];
  const factory = id => scene => {
    created.push(id);
    const group = new THREE.Group(); scene.add(group);
    return { group, update() {}, dispose() { released.push(id); } };
  };
  const preview = createUpcomingShowcase({
    'dune-tempest': factory('dune'),
    'monsoon-ruins': factory('monsoon'),
    'skyfall-archipelago': factory('skyfall'),
  }, new THREE.Texture(), new THREE.Texture());
  preview.setTrack('dune-tempest');
  preview.setTrack('monsoon-ruins');
  preview.setTrack('skyfall-archipelago');
  assert.deepEqual(released, ['dune'], 'the first of three stages must be evicted');
  preview.setTrack('monsoon-ruins');
  assert.deepEqual(created, ['dune', 'monsoon', 'skyfall'], 'recent stage should be reused');
  preview.dispose();
  assert.deepEqual(released.sort(), ['dune', 'monsoon', 'skyfall']);
});

test('cached showcase uses the latest car paint when reselected', () => {
  const make = scene => {
    const group = new THREE.Group(); scene.add(group);
    return { group, update() {}, dispose() {} };
  };
  const showcase = createUpcomingShowcase({
    'dune-tempest': make, 'monsoon-ruins': make,
  }, new THREE.Texture(), new THREE.Texture());
  showcase.setTrack('dune-tempest');
  const firstCar = showcase.scene.children.find(child => child.userData?.body);
  showcase.setTrack('monsoon-ruins');
  showcase.setPaint({ paint: '#ff0000', metalness: .2, roughness: .8, light: [1, 1, 1] });
  showcase.setTrack('dune-tempest');
  assert.equal(showcase.scene.children.find(child => child.userData?.body), firstCar);
  assert.equal(firstCar.userData.body.material.color.getHexString(), 'ff0000');
  showcase.dispose();
});
