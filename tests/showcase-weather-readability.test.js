import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUpcomingEnvironment as createDune } from '../src/upcoming-scenes/dune-tempest.ts';
import { createUpcomingEnvironment as createSkyfall } from '../src/upcoming-scenes/skyfall-archipelago.ts';

const localLighting = group => group.children
  .filter(object => object instanceof THREE.HemisphereLight || object instanceof THREE.DirectionalLight)
  .reduce((sum, light) => sum + light.intensity, 0);

test('Dune home keeps distant golden storm atmosphere without washing out near cars', () => {
  const scene = new THREE.Scene();
  const environment = createDune(scene);
  environment.update(8, 'high', false, false);
  assert.ok(scene.fog instanceof THREE.FogExp2);
  assert.ok(scene.fog.density <= 0.0014, 'dense near-camera fog removes vehicle body detail');
  assert.ok(localLighting(environment.group) <= 2.2,
    'map-local light must not overexpose the shared Roadster under host lighting');
  const dust = environment.group.getObjectByName('Windblown sand particles');
  assert.ok(dust instanceof THREE.Points);
  assert.ok(dust.material.opacity <= 0.28, 'dust should remain behind the readable foreground');
  environment.dispose();
  assert.equal(scene.fog, null, 'map restores the previous scene fog on exit');
});

test('Skyfall home keeps floating cloud ocean but preserves nearby car contrast', () => {
  const scene = new THREE.Scene();
  const environment = createSkyfall(scene);
  environment.update(8, 'high', false, false);
  assert.ok(localLighting(environment.group) <= 2.2,
    'environment light should complement, not duplicate, the shared vehicle light');
  const near = environment.group.getObjectByName('Skyfall near cloud ocean');
  assert.ok(near instanceof THREE.InstancedMesh);
  assert.ok(near.material.opacity <= 0.28,
    'translucent cloud banks should not make the vehicle outlines unreadable');
  assert.ok(environment.group.getObjectByName('Skyfall giant stone ring'),
    'keep the map identity and distant stone landmark');
  environment.dispose();
});
