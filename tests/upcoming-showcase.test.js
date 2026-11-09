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

test('showcase shares a Three.js scene and disposes old environment on track change', () => {
  const released = [];
  const updates = [];
  const create = name => scene => {
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
  assert.equal(showcase.setTrack('monsoon-ruins'), true);
  assert.deepEqual(released, ['dune']);
  assert.equal(showcase.setTrack(null), false);
  assert.equal(showcase.scene, null);
  assert.deepEqual(released, ['dune', 'monsoon']);
  showcase.dispose();
  assert.deepEqual(released, ['dune', 'monsoon'], 'no double-disposal');
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
  const showcase = createUpcomingShowcase({ 'dune-tempest': env, 'monsoon-ruins': env }, new THREE.Texture(), new THREE.Texture(),
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
  assert.deepEqual(released, [{ host: first, attached: true }], 'released while the old car still exists');
  assert.notEqual(showcase.modelHost, first);
  showcase.dispose();
  assert.equal(released.length, 2);
});
