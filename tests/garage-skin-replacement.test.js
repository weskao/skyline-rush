import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3 } from 'three';
import { createAeroVFX } from '../src/aero-vfx.js';
import { createRace } from '../src/game.js';
import { vfxSettings } from '../src/vfx-settings.ts';
import { LAUNCH_FLARE_STYLES } from '../src/garage-launch-flare-styles.ts';

// An equipped skin replaces the standard effect in its slot instead of layering over it.
function rig() {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(car);
  const aero = createAeroVFX(scene, car), race = createRace();
  return { scene, car, aero, race, origin: new Vector3(), settings: vfxSettings({ enabled: true, airflow: true, quality: 'high' }) };
}
const PREMIUM_FLARES = Object.keys(LAUNCH_FLARE_STYLES);

test('a premium launch flare replaces the standard shock ring at race start and in the Studio loop', () => {
  for (const id of PREMIUM_FLARES) {
    const { scene, aero, race, origin, settings } = rig();
    const ring = scene.getObjectByName('Ignition shockwave'), burst = scene.getObjectByName('Launch flare burst');
    aero.setSkins({ 'launch-flare': id });
    race.player.boosting = false; race.player.nitroTime = 0; race.player.miniBoost = 0;
    race.phase = 'countdown'; aero.update(race, 0.05, origin, settings, false);
    race.phase = 'racing'; aero.update(race, 0.05, origin, settings, false);
    assert.equal(burst.visible, true, `${id} bursts at race start`);
    assert.equal(ring.visible, false, `${id} replaces the standard ring at race start`);
    aero.reset(); race.phase = 'ready';
    let ringSeen = false, bursts = 0, was = false;
    for (let n = 0; n < 300; n++) {
      aero.update(race, 1 / 60, origin, settings, false, null, true);
      ringSeen ||= ring.visible;
      if (burst.visible && !was) bursts++;
      was = burst.visible;
    }
    assert.ok(bursts >= 2, `${id} still loops in the Studio`);
    assert.equal(ringSeen, false, `${id} never shows the standard ring in the Studio`);
  }
});

test('the Studio never loops the standard shock ring; BOOST ignition in a race still rings', () => {
  const { scene, aero, race, origin, settings } = rig();
  const ring = scene.getObjectByName('Ignition shockwave');
  aero.setSkins({ 'launch-flare': 'launch-flare-basic' });
  race.phase = 'ready';
  let ringSeen = false;
  for (let n = 0; n < 200; n++) { aero.update(race, 1 / 60, origin, settings, false, null, true); ringSeen ||= ring.visible; }
  assert.equal(ringSeen, false, 'no standard ring halo loops in the Studio preview');
  aero.reset(); aero.setSkins({ 'launch-flare': 'launch-flare-gold' });
  race.player.boosting = false; race.player.nitroTime = 0; race.player.miniBoost = 0;
  race.phase = 'racing';
  for (let n = 0; n < 90; n++) aero.update(race, 1 / 60, origin, settings, false); // the launch flare fades
  race.player.boosting = true; aero.update(race, 1 / 60, origin, settings, false);
  assert.equal(ring.visible, true, 'a later BOOST ignition is not a launch and keeps its ring');
});

test('a NITRO trail skin replaces the standard purple on the airflow, the nozzles and the NITRO ring', () => {
  const { scene, car, aero, race, origin, settings } = rig();
  const flow = car.getObjectByName('Airflow showcase').children[0];
  const jets = car.getObjectByName('Rear ports').children.filter(child => child.name.startsWith('Cold gas nozzle'));
  const ring = scene.getObjectByName('Ignition shockwave');
  const nitro = () => {
    aero.reset(); race.phase = 'racing'; race.player.boosting = false; race.player.nitroTime = 0;
    aero.update(race, 0.05, origin, settings, false);
    race.player.nitroTime = 2; aero.update(race, 0.05, origin, settings, false);
  };
  // Purple is the NITRO colour only while no trail skin overrides it, over the whole streamline (no tail-only accent).
  assert.match(flow.material.fragmentShader, /mix\(vec3\(\.72,\.4,1\.\),trailAccent\.rgb,trailAccent\.a\)/);
  assert.doesNotMatch(flow.material.fragmentShader, /trailAccent\.a\*[^;]*vUv\.x/, 'skin colour covers the fronts too');
  for (const jet of jets) assert.match(jet.material.fragmentShader, /mix\(vec3\(\.68,\.42,1\.\),trailAccent\.rgb,trailAccent\.a\)/);
  aero.setSkins({});
  nitro();
  const standardRing = ring.material.color.toArray();
  assert.ok(standardRing[2] > standardRing[1], 'standard NITRO ring stays violet');
  for (const jet of jets) assert.equal(jet.material.uniforms.trailAccent.value.w, 0, 'standard nozzles keep purple');
  aero.setSkins({ 'nitro-trail': 'nitro-trail-gold' });
  nitro();
  const accent = flow.material.uniforms.trailAccent.value;
  assert.equal(accent.w, 1);
  for (const jet of jets) assert.deepEqual(jet.material.uniforms.trailAccent.value.toArray(), accent.toArray(), 'nozzles share the trail colour');
  assert.equal(ring.visible, true);
  assert.deepEqual(ring.material.color.toArray(), [accent.x, accent.y, accent.z], 'NITRO ring takes the trail colour');
});

test('Void Pulse replaces the standard nozzle flames with its beams; other thrusters keep the flames', () => {
  const { car, aero, race, origin, settings } = rig();
  const jets = car.getObjectByName('Rear ports').children.filter(child => child.name.startsWith('Cold gas nozzle'));
  const beams = car.getObjectByName('Void pulse beams');
  race.phase = 'racing'; race.player.boosting = true; race.player.speed = 90;
  aero.setSkins({ thruster: 'thruster-void' });
  aero.update(race, 0.12, origin, settings, false);
  assert.equal(beams.visible, true);
  assert.ok(jets.every(jet => !jet.visible), 'no standard flame under the void beams');
  aero.setSkins({ thruster: 'thruster-plasma' });
  aero.update(race, 0.12, origin, settings, false);
  assert.equal(beams.visible, false);
  assert.ok(jets.every(jet => jet.visible), 'tinted thrusters still use the nozzle flames');
});
