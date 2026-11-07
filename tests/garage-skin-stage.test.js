import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGarageStage } from '../src/garage-stage.ts';
import { defaultGarageCamera } from '../src/garage-camera.ts';
import { vfxSettings } from '../src/vfx-settings.ts';

test('Studio preview uses the same real Aero renderer and cosmetics as the race scene', () => {
  const stage = createGarageStage(new THREE.Texture(), new THREE.Texture());
  const camera = new THREE.PerspectiveCamera(49, 1.5, .1, 500);
  const colors = { thruster: 'thruster-ion', airflow: 'airflow-slipstream', 'nitro-trail': 'nitro-trail-cyan', 'launch-flare': 'launch-flare-blue' };
  stage.setSkins(colors);
  stage.configureVFX(vfxSettings({ enabled: true, quality: 'medium', airflow: true }));
  stage.update(camera, defaultGarageCamera(), 1, false);
  const flow = stage.scene.getObjectByName('Airflow showcase');
  const ribbon = stage.scene.getObjectByName('Continuous dash ribbon');
  assert.ok(flow, 'studio has actual shared Aero flow shader');
  assert.ok(ribbon, 'studio uses the existing nitro ribbon geometry');
  assert.deepEqual(flow.children.find(child => child.geometry?.attributes.flowType).material.uniforms.skinTint.value.toArray(), [0.56, 1.35, 1.2]);
  assert.deepEqual(ribbon.material.uniforms.skinTint.value.toArray(), [0.36, 1.4, 1.24]);
  const count = stage.scene.children.length;
  for (let i = 0; i < 50; i++) stage.update(camera, defaultGarageCamera(), 1 + (i + 1) / 60, false);
  assert.equal(stage.scene.children.length, count, 'preview frames do not allocate new meshes');
  assert.equal(stage.scene.children.find(object => object.userData.body)?.position.z, 0,
    'the visible car must remain centred while its shared wake is demonstrated');
  assert.ok(ribbon.geometry.attributes.alpha.array.some(alpha => alpha > 0), 'real NITRO trail must be visible in Studio preview');
  let localDisposed = 0, worldDisposed = 0;
  flow.children.find(child => child.geometry?.attributes.flowType).geometry
    .addEventListener('dispose', () => { localDisposed++; });
  ribbon.geometry.addEventListener('dispose', () => { worldDisposed++; });
  stage.dispose();
  assert.equal(localDisposed, 1, 'Studio disposes unique Aero tube geometry');
  assert.equal(worldDisposed, 1, 'Studio disposes unique world-space Nitro ribbon geometry');
});

test('garage camera fit and full-car bounds ignore cosmetic VFX tube geometry', () => {
  const stage = createGarageStage(new THREE.Texture(), new THREE.Texture());
  const camera = new THREE.PerspectiveCamera(49, .65, .1, 500);
  stage.update(camera, defaultGarageCamera(), 1, false);
  const before = stage.inspectBounds(camera);
  const aero = stage.scene.getObjectByName('Airflow showcase');
  aero.scale.setScalar(5);
  assert.deepEqual(stage.inspectBounds(camera), before, 'an oversized VFX tube must not shrink or clip the vehicle');
  stage.dispose();
});
