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

test('blue launch flare ignites at race start without a BOOST/NITRO input or stat mutation', async () => {
  const { createRace } = await import('../src/game.js');
  const { Vector3 } = await import('three');
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  const aero = createAeroVFX(scene, car), race = createRace(), origin = new Vector3();
  const { vfxSettings } = await import('../src/vfx-settings.ts');
  const visual = vfxSettings({ enabled: true, airflow: true });
  race.phase = 'countdown';
  race.player.boosting = false; race.player.nitroTime = 0; race.player.miniBoost = 0;
  aero.setSkins({ 'launch-flare': 'launch-flare-blue' });
  aero.update(race, 0.05, origin, visual, false);
  race.phase = 'racing';
  const before = structuredClone(race);
  aero.update(race, 0.05, origin, visual, false);
  assert.equal(scene.getObjectByName('Ignition shockwave').visible, true);
  assert.deepEqual(race, before);
  aero.reset();
  aero.setSkins({ 'launch-flare': 'launch-flare-basic' });
  race.phase = 'countdown'; aero.update(race, 0.05, origin, visual, false);
  race.phase = 'racing'; aero.update(race, 0.05, origin, visual, false);
  assert.equal(scene.getObjectByName('Ignition shockwave').visible, false, 'baseline launch remains unchanged');
});

// No new materials/geometry on selection; shape/motion is encoded in shader uniforms.
test('selected skins switch shape and timing patterns in the shared WebGL renderer', () => {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  const aero = createAeroVFX(scene, car);
  const flow = aero.group.children.find(child => child.geometry?.attributes.flowType);
  const jet = aero.group.children.find(child => child.name.startsWith('Cold gas nozzle'));
  const ribbon = scene.getObjectByName('Continuous dash ribbon');
  const shock = scene.getObjectByName('Ignition shockwave');
  const original = [flow.material, jet.material, ribbon.material, shock.geometry];
  for (let mode = 1; mode <= 3; mode++) {
    const ids = [
      { thruster: 'thruster-ion', airflow: 'airflow-slipstream', 'nitro-trail': 'nitro-trail-cyan', 'launch-flare': 'launch-flare-blue' },
      { thruster: 'thruster-plasma', airflow: 'airflow-vortex', 'nitro-trail': 'nitro-trail-gold', 'launch-flare': 'launch-flare-ring' },
      { thruster: 'thruster-void', airflow: 'airflow-prism', 'nitro-trail': 'nitro-trail-red', 'launch-flare': 'launch-flare-pulse' },
    ][mode - 1];
    aero.setSkins(ids);
    assert.equal(flow.material.uniforms.skinPattern.value, mode);
    assert.equal(jet.material.uniforms.skinPattern.value, mode);
    assert.equal(ribbon.material.uniforms.skinPattern.value, mode);
    assert.equal(shock.userData.skinPattern, mode);
    assert.deepEqual([flow.material, jet.material, ribbon.material, shock.geometry], original);
  }
  aero.setSkins({ thruster: 'airflow-vortex' });
  assert.equal(jet.material.uniforms.skinPattern.value, 0);
});
