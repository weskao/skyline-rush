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
  assert.equal(scene.getObjectByName('Launch flare burst').visible, true);
  assert.equal(scene.getObjectByName('Ignition shockwave').visible, false, 'the flare replaces the standard ring');
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


test('void pulse creates visible car-mounted energy beams, and toggling skins reuses GPU resources', async () => {
  const { createRace } = await import('../src/game.js');
  const { vfxSettings } = await import('../src/vfx-settings.ts');
  const { Vector3 } = await import('three');
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  const aero = createAeroVFX(scene, car), race = createRace();
  const settings = vfxSettings({ enabled: true, airflow: true, quality: 'high' });
  race.phase = 'racing'; race.player.boosting = true; race.player.speed = 95;
  aero.setSkins({ thruster: 'thruster-void' });
  aero.update(race, 0.12, new Vector3(), settings, false, null, true);
  const beams = car.getObjectByName('Void pulse beams');
  assert.ok(beams, 'real car-mounted beam mesh, not just recoloured airflow');
  assert.ok(beams.visible, 'void pulse beams visible during preview');
  assert.equal(beams.count, 4, 'one instanced ray per rear nozzle');
  const geometry = beams.geometry, material = beams.material;
  aero.setSkins({ thruster: 'thruster-plasma' });
  aero.update(race, 0.12, new Vector3(), settings, false, null, true);
  assert.equal(beams.visible, false, 'void beams must not leak into other skins');
  aero.setSkins({ thruster: 'thruster-void' });
  aero.update(race, 0.12, new Vector3(), settings, false, null, true);
  assert.equal(beams.geometry, geometry);
  assert.equal(beams.material, material);
  assert.equal(beams.visible, true);
  aero.update(race, 0.12, new Vector3(), { ...settings, enabled: false }, false, null, true);
  assert.equal(beams.visible, false, 'VFX Off must hide beams');
});

test('ring and pulse flares loop visibly in Studio without altering race progress', async () => {
  const { createRace } = await import('../src/game.js');
  const { vfxSettings } = await import('../src/vfx-settings.ts');
  const { Vector3 } = await import('three');
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  const aero = createAeroVFX(scene, car), race = createRace();
  const settings = vfxSettings({ enabled: true, airflow: true, quality: 'high' });
  race.phase = 'racing'; race.player.boosting = true;
  const before = structuredClone(race);
  const burst = scene.getObjectByName('Launch flare burst');
  for (const id of ['launch-flare-ring', 'launch-flare-pulse']) {
    aero.setSkins({ 'launch-flare': id });
    aero.update(race, 0.05, new Vector3(), settings, false, null, true);
    assert.equal(burst.visible, true, `${id} must appear immediately after Preview`);
    assert.ok(burst.material.uniforms.power.value > 0, 'visible pulse must have positive power');
    let repetitions = 0, wasVisible = true;
    for (let n = 0; n < 150; n++) {
      aero.update(race, 1 / 60, new Vector3(), settings, false, null, true);
      if (!wasVisible && burst.visible) repetitions++;
      wasVisible = burst.visible;
    }
    assert.ok(repetitions >= 1, `${id} needs repeated studio demo pulses`);
  }
  assert.deepEqual(race, before, 'cosmetics do not change acceleration or race state');
});

test('Garage Home readied car previews NITRO ribbon and Void beams even without race boost', async () => {
  const { createRace } = await import('../src/game.js');
  const { Vector3 } = await import('three');
  const { vfxSettings } = await import('../src/vfx-settings.ts');
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  const aero = createAeroVFX(scene, car), race = createRace();
  race.phase = 'ready'; race.player.speed = 0; race.player.boosting = false;
  race.player.nitroTime = race.player.miniBoost = 0;
  const original = structuredClone(race);
  const settings = vfxSettings({ enabled: true, airflow: true });
  aero.setSkins({ thruster: 'thruster-void', 'nitro-trail': 'nitro-trail-gold' });
  for (let i = 0; i < 90; i++) aero.update(race, 1 / 60, new Vector3(), settings, false, null, true);
  assert.equal(car.getObjectByName('Void pulse beams').visible, true);
  assert.ok(scene.getObjectByName('Continuous dash ribbon').geometry.attributes.alpha.array.some(a => a > 0),
    'ready-phase Home must preview the real wake, rather than hiding all NITRO skins');
  assert.deepEqual(race, original);
});

test('purple nebula NITRO is a moving shader ribbon, not an RGB-only static decal', async () => {
  const { createRace } = await import('../src/game.js');
  const { vfxSettings } = await import('../src/vfx-settings.ts');
  const { Vector3 } = await import('three');
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  const aero = createAeroVFX(scene, car), race = createRace();
  race.phase = 'racing'; race.player.boosting = true;
  const ribbon = scene.getObjectByName('Continuous dash ribbon');
  const initialMaterial = ribbon.material;
  aero.setSkins({ 'nitro-trail': 'nitro-trail-purple' });
  aero.update(race, 0.05, new Vector3(), vfxSettings({ enabled: true }), false);
  assert.equal(ribbon.material.uniforms.skinPattern.value, 4);
  const firstTime = ribbon.material.uniforms.time.value;
  aero.update(race, 0.08, new Vector3(), vfxSettings({ enabled: true }), false);
  assert.ok(ribbon.material.uniforms.time.value > firstTime);
  assert.equal(ribbon.material, initialMaterial, 'live uniforms, no per-frame GPU allocation');
});

test('void beams are tapered glowing rods, bright along their core, so they keep depth seen from behind', () => {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  createAeroVFX(scene, car);
  const beams = car.getObjectByName('Void pulse beams');
  const { radiusTop, radiusBottom } = beams.geometry.parameters;
  assert.ok(radiusBottom > radiusTop * 1.8, 'wide at the nozzle, narrowing into the distance');
  assert.match(beams.material.vertexShader, /vFacing=abs\(dot\(/, 'view-facing term gives the rod volume');
  assert.match(beams.material.fragmentShader, /vFacing/);
});
