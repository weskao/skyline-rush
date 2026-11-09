import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUpcomingShowcase } from '../src/upcoming-showcase.ts';

// The center of every car must fit inside the camera with space for its silhouette.
// Real WebGL desktop/phone screenshots remain a separate visual gate.
test('Dune and Skyfall keep all three rivals close and inside the hero frame on desktop and phone', () => {
  const maps = ['dune-tempest', 'skyfall-archipelago'];
  const factories = Object.fromEntries(maps.map(id => [id, scene => {
    const group = new THREE.Group();
    scene.add(group);
    return { group, update() {}, dispose() {} };
  }]));
  const showcase = createUpcomingShowcase(factories, new THREE.Texture(), new THREE.Texture());
  for (const aspect of [16 / 9, 390 / 844]) {
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
    for (const id of maps) {
      assert.equal(showcase.setTrack(id), true);
      showcase.update(camera, 3, { view: 'drive', quality: 'high', enabled: true, airflow: false }, true);
      const cars = showcase.scene.children.filter(item => item.userData?.jets);
      assert.equal(cars.length, 4, id);
      assert.equal(camera.fov, 50, 'keep the shared 50-degree camera');
      for (const [index, car] of cars.entries()) {
        const projected = car.position.clone().project(camera);
        assert.ok(Math.abs(projected.x) < 0.88,
          `${id} car ${index} clips horizontally at aspect ${aspect}: ${projected.x}`);
        assert.ok(Math.abs(projected.y) < 0.88,
          `${id} car ${index} clips vertically at aspect ${aspect}: ${projected.y}`);
        if (index !== 0) assert.ok(camera.position.distanceTo(car.position) < (aspect < 0.78 ? 47 : 43),
          `${id} rival ${index} is too distant to read at aspect ${aspect}`);
      }
    }
  }
  showcase.dispose();
});
