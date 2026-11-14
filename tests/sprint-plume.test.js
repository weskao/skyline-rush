import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Group, Scene, Mesh, BoxGeometry, Vector3, NormalBlending } from 'three';
import { REAR_PORTS, createAeroVFX } from '../src/aero-vfx.js';
import * as plumeModule from '../src/sprint-plume.ts';
import { createRace } from '../src/game.js';
import { MAX_SPEED, NITRO_CAP_BONUS } from '../src/drive-rules.ts';
import { VFX_RANGES, vfxSettings, sprintFovOffset } from '../src/vfx-settings.ts';
import { RACE_CAMERA, rigBack, rigLook, rigHeight, rigFov } from '../src/race-camera.ts';
import { GARAGE_SKINS } from '../src/garage-skin-catalog.ts';

const { createSprintPlume, PLUME, plumeRadius, coreRadius } = plumeModule;
const JET_UNIFORMS = ['time', 'power', 'brightness', 'diamonds', 'extreme', 'nitroMix', 'tail', 'skinTint', 'skinPattern', 'trailAccent'];
/** One frame as src/aero-vfx.js fills it: a full-power sprint on High, racing on the road. */
const frame = (over = {}) => ({ time: 2, power: 1, nitroMix: 0, reach: 5, brightness: 1, diamonds: 0.5, extreme: 0, tail: 0,
  quality: 1, enabled: true, calm: false, voidPulse: false, racing: true, grounded: true, ...over });
const jetsOf = parent => parent.children.filter(child => child.name.startsWith('Cold gas nozzle'));

test('the rear exhaust lives in its own module', () => {
  assert.equal(typeof createSprintPlume, 'function');
  const aero = readFileSync(new URL('../src/aero-vfx.js', import.meta.url), 'utf8');
  assert.doesNotMatch(aero, /Cold gas nozzle|jetMaterial/, 'aero-vfx.js no longer builds the jets');
  const parent = new Group(), plume = createSprintPlume(parent, REAR_PORTS), jets = jetsOf(parent);
  assert.deepEqual(jets.map(jet => jet.name), [1, 2, 3, 4].map(n => `Cold gas nozzle ${n}`));
  assert.deepEqual(plume.jets, jets);
  assert.deepEqual(jets.map(jet => jet.position.x), REAR_PORTS.map(port => port.position[0]));
  assert.ok(jets.every(jet => !jet.visible), 'hidden from creation: the world warm-up compiles them');
  assert.equal(new Set(jets.map(jet => jet.material)).size, 4, 'each jet has its own material');
  for (const jet of jets) for (const name of JET_UNIFORMS) assert.ok(name in jet.material.uniforms, `uniform ${name}`);
  plume.update(frame());
  jets.forEach((jet, i) => {
    assert.ok(jet.visible);
    assert.equal(jet.scale.z, 5);
    assert.equal(jet.material.uniforms.time.value, 2 + i * 0.13);
  });
  plume.reset();
  assert.ok(jets.every(jet => !jet.visible), 'reset hides the jets');
});

// Trap (2026-11-14): each jet left at a 6.5 cm radius and stayed under 0.14 m for its first 0.6 m (15 to 19 px on a
// phone), additive only, so a held NITRO/BOOST barely showed. The flame is fat by 0.6 m whatever the tail length.
test('flame shape: fat by 0.6 m whatever the length or brightness, four separate cores', () => {
  assert.equal(plumeRadius(0), REAR_PORTS[0].size);
  assert.ok(plumeRadius(0.6) >= 0.2 && plumeRadius(3) <= 0.3);
  for (let d = 0; d < 3; d += 0.1) {
    assert.ok(plumeRadius(d + 0.1) >= plumeRadius(d), 'never narrows');
    assert.ok(coreRadius(d) <= 0.1 && 2 * coreRadius(d) <= 0.4 - 0.1, 'cores stay 10 cm apart: ports are 0.40 m apart');
  }
  assert.ok(2 * plumeRadius(0.6) > 0.4, 'the outer glows overlap into one band');
  assert.equal(coreRadius(0), PLUME.nozzle, 'the core leaves at the nozzle radius');
  assert.ok(Math.abs(Math.max(...Array.from({ length: 181 }, (_, i) => coreRadius(i / 100))) - PLUME.coreMax) < 1e-9, 'coreMax at its widest');
  assert.equal(coreRadius(PLUME.coreLength), 0);
});

const PHONES = [['landscape 844x390', RACE_CAMERA.chase, 390], ['portrait 390x844', RACE_CAMERA.chasePortrait, 844]];
const SPRINTS = [['NITRO top speed', MAX_SPEED + NITRO_CAP_BONUS, 1], ['held BOOST', MAX_SPEED, 0.62]];
/** Pixels a `metres`-wide span covers `behind` m behind the nozzles: the live rig on a straight road, default FOV setting. */
function pixels(view, rows, speed, share, behind, metres) {
  const fov = rigFov(view, speed) + sprintFovOffset({ fov: share, punch: 0 }, { enabled: true, fov: VFX_RANGES.fov[4] });
  const eye = new Vector3(0, rigHeight(view, 0), rigBack(view, fov));
  const axis = new Vector3(0, rigLook(view, fov, share), -view.ahead).sub(eye).normalize();
  const [, y, z] = REAR_PORTS[0].position, depth = new Vector3(0, y, z + behind).sub(eye).dot(axis);
  return metres / depth * rows / (2 * Math.tan(fov * Math.PI / 360));
}

test("phone width: each jet's glow is at least 28 px wide 0.6 m and 20 px wide 1 m behind the nozzles", () => {
  assert.equal(MAX_SPEED, 88);
  for (const [phone, view, rows] of PHONES) for (const [state, speed, share] of SPRINTS) {
    const at = (behind, metres) => pixels(view, rows, speed, share, behind, metres), name = `${phone}, ${state}`;
    assert.ok(at(0.6, 2 * plumeRadius(0.6)) >= 28, `${name}: ${at(0.6, 2 * plumeRadius(0.6)).toFixed(1)} px at 0.6 m`);
    assert.ok(at(1, 2 * plumeRadius(1)) >= 20, `${name}: ${at(1, 2 * plumeRadius(1)).toFixed(1)} px at 1 m`);
    const spacing = REAR_PORTS[1].position[0] - REAR_PORTS[0].position[0];
    assert.ok(at(1, spacing - 2 * coreRadius(1)) >= 8, `${name}: the cores stay ${at(1, spacing - 2 * coreRadius(1)).toFixed(1)} px apart at 1 m`);
  }
});

/** A held NITRO at top speed through the real createAeroVFX. */
function heldNitro(settings, skins) {
  const scene = new Scene(), vehicle = new Group();
  vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(vehicle);
  const vfx = createAeroVFX(scene, vehicle), race = createRace(), origin = new Vector3();
  race.phase = 'racing'; race.player.nitroTime = 30; race.player.speed = MAX_SPEED + NITRO_CAP_BONUS;
  if (skins) vfx.setSkins(skins);
  const options = vfxSettings(settings);
  for (let i = 0; i < 20; i++) vfx.update(race, 0.05, origin, options, false);
  return { jets: jetsOf(scene.getObjectByName('Rear ports')), core: scene.getObjectByName('Sprint plume core') };
}

test('the real jets carry the profile on every tier, preset and thruster skin', () => {
  const thrusters = GARAGE_SKINS.filter(skin => skin.category === 'thruster').map(skin => skin.id);
  assert.ok(thrusters.length >= 4 && thrusters.includes('thruster-void'));
  for (const quality of ['low', 'medium', 'high']) for (const preset of ['cinematic', 'realistic', 'extreme']) for (const id of thrusters) {
    const { jets, core } = heldNitro({ quality, preset }, { thruster: id }), name = `${quality}, ${preset}, ${id}`;
    assert.equal(jets.length, 4);
    assert.ok(core?.isInstancedMesh && core.count === 4, `${name}: one instanced core per nozzle`);
    if (id === 'thruster-void') {
      assert.ok(jets.every(jet => !jet.visible) && !core.visible, `${name}: the void beams replace jets and core`);
      continue;
    }
    assert.ok(core.visible, `${name}: core visible`);
    for (const jet of jets) {
      assert.ok(jet.visible, `${name}: jet visible`);
      assert.equal(jet.scale.x, 1, name); assert.equal(jet.scale.y, 1, name);
      assert.ok(jet.scale.z > 0 && jet.material.uniforms.reach.value === jet.scale.z, `${name}: reach is the jet length`);
      assert.equal(jet.material.uniforms.thick.value, 1, `${name}: full thickness`);
      assert.ok(jet.material.vertexShader.includes(String(PLUME.half)), 'the shader takes the profile from PLUME');
    }
  }
  // Low + Realistic is what a 2-core phone auto-picks (src/device-quality.ts): the same fat flame as High + Extreme.
  const phone = heldNitro({ quality: 'low', preset: 'realistic' }).core.material, desk = heldNitro({ quality: 'high', preset: 'extreme' }).core.material;
  assert.ok(phone.uniforms.alpha.value > 0.8, 'the core is as opaque on the phone tier');
  assert.equal(phone.uniforms.alpha.value, desk.uniforms.alpha.value, 'core brightness ignores coreBrightness, tier and bloom');
  assert.equal(phone.fragmentShader, desk.fragmentShader);
  assert.doesNotMatch(phone.fragmentShader, /brightness/, 'the core has no coreBrightness term');
});

test('the core is drawn over daylight: normal blending, no depth write, hidden from creation', () => {
  const parent = new Group(), plume = createSprintPlume(parent, REAR_PORTS), core = parent.getObjectByName('Sprint plume core');
  assert.ok(core.isInstancedMesh && core.count === 4 && !core.visible);
  const { material } = core;
  assert.deepEqual([material.blending, material.transparent, material.depthWrite, material.depthTest], [NormalBlending, true, false, true]);
  plume.update(frame({ power: 0.5 }));
  assert.ok(core.visible);
  assert.ok(Math.abs(material.uniforms.alpha.value - 0.425) < 1e-9, 'alpha is 0.85 times the power');
  plume.update(frame({ power: 1.4 }));
  assert.equal(material.uniforms.alpha.value, 0.85, 'a x3 chain clamps the core at 0.85');
  plume.update(frame({ enabled: false }));
  assert.ok(!core.visible && plume.jets.every(jet => !jet.visible), 'VFX Off hides jets and core');
  plume.update(frame());
  plume.reset();
  assert.ok(!core.visible, 'reset hides the core');
});
