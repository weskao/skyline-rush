import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUpcomingShowcase } from '../src/upcoming-showcase.ts';

const id = 'dune-tempest';

test('missing environment never presents a fake live Three.js showcase', () => {
  const showcase = createUpcomingShowcase({}, new THREE.Texture());
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
  }, new THREE.Texture());
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
