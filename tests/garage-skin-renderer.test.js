import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry } from 'three';
import { createAeroVFX } from '../src/aero-vfx.js';

test('garage cosmetics bind shared Aero shaders without reallocating scene or mutating geometry', () => {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  const aero = createAeroVFX(scene, car);
  const flow = aero.group.children.find(child => child.geometry?.attributes.flowType);
  const jet = aero.group.children.find(child => child.name.startsWith('Cold gas nozzle'));
  const ribbon = scene.getObjectByName('Continuous dash ribbon');
  const shock = scene.getObjectByName('Ignition shockwave');
  const originalGeometry = { flow: flow.geometry, jet: jet.geometry, ribbon: ribbon.geometry };
  const count = scene.children.length;
  assert.deepEqual(flow.material.uniforms.skinTint.value.toArray(), [1, 1, 1]);
  aero.setSkins({ thruster: 'thruster-ion', airflow: 'airflow-slipstream', 'nitro-trail': 'nitro-trail-cyan', 'launch-flare': 'launch-flare-blue' });
  assert.deepEqual(flow.material.uniforms.skinTint.value.toArray(), [0.56, 1.35, 1.2]);
  assert.deepEqual(jet.material.uniforms.skinTint.value.toArray(), [0.38, 1.1, 1.8]);
  assert.deepEqual(ribbon.material.uniforms.skinTint.value.toArray(), [0.36, 1.4, 1.24]);
  assert.deepEqual(shock.material.color.toArray(), [0.35, 0.75, 1.65]);
  aero.setSkins({ thruster: '../../tampered', airflow: 'thruster-ion' });
  assert.deepEqual(flow.material.uniforms.skinTint.value.toArray(), [1, 1, 1]);
  assert.deepEqual(jet.material.uniforms.skinTint.value.toArray(), [1, 1, 1]);
  assert.equal(scene.children.length, count);
  assert.equal(flow.geometry, originalGeometry.flow);
  assert.equal(jet.geometry, originalGeometry.jet);
  assert.equal(ribbon.geometry, originalGeometry.ribbon);
});
