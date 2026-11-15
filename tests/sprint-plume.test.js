import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Group, Scene, Mesh, BoxGeometry, Object3D, Vector3, Vector4, Quaternion, NormalBlending, AdditiveBlending } from 'three';
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
// Trap (2026-11-16): a trailing `//` comment swallowed `u.tail = frame.tail` on the same line; the board plume's magenta tail never lit.
test('every frame value reaches every jet', () => {
  const parent = new Group(), plume = createSprintPlume(parent, REAR_PORTS);
  plume.update(frame({ power: 0.64, brightness: 0.7, diamonds: 0.3, extreme: 0.4, nitroMix: 0.6, tail: 0.8 }));
  for (const jet of jetsOf(parent)) {
    const u = jet.material.uniforms;
    assert.deepEqual([u.power.value, u.brightness.value, u.diamonds.value, u.extreme.value, u.nitroMix.value, u.tail.value, u.reach.value],
      [0.8, 0.7, 0.3, 0.4, 0.6, 0.8, 5], jet.name);
  }
});

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
function heldNitro(settings, skins, { altitude = 0, reducedMotion = false } = {}) {
  const scene = new Scene(), vehicle = new Group();
  vehicle.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(vehicle);
  const vfx = createAeroVFX(scene, vehicle), race = createRace(), origin = new Vector3();
  race.phase = 'racing'; race.player.nitroTime = 30; race.player.speed = MAX_SPEED + NITRO_CAP_BONUS; race.player.altitude = altitude;
  if (skins) vfx.setSkins(skins);
  const options = vfxSettings(settings);
  for (let i = 0; i < 20; i++) vfx.update(race, 0.05, origin, options, reducedMotion);
  const part = name => scene.getObjectByName(name);
  return { jets: jetsOf(part('Rear ports')), core: part('Sprint plume core'), flare: part('Sprint nozzle flare'), glow: part('Sprint road glow') };
}

test('the real jets carry the profile on every tier, preset and thruster skin', () => {
  const thrusters = GARAGE_SKINS.filter(skin => skin.category === 'thruster').map(skin => skin.id);
  assert.ok(thrusters.length >= 4 && thrusters.includes('thruster-void'));
  for (const quality of ['low', 'medium', 'high']) for (const preset of ['cinematic', 'realistic', 'extreme']) for (const id of thrusters) {
    const { jets, core, flare, glow } = heldNitro({ quality, preset }, { thruster: id }), name = `${quality}, ${preset}, ${id}`;
    assert.equal(jets.length, 4);
    assert.ok(flare?.visible, `${name}: the nozzle flare shows on every tier and skin`);
    assert.equal(glow?.visible, quality !== 'low', `${name}: the road glow is Medium and High only`);
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

/** A plume on a car over a level road. `ground` is a plane whose +z is the road's up, as createAeroVFX passes it. */
function rig({ roll = 0, pitch = 0, ground = true } = {}) {
  const vehicle = new Group(), parent = new Group(), road = new Object3D();
  road.rotation.x = -Math.PI / 2; vehicle.rotation.set(pitch, 0, roll); vehicle.add(parent);
  const plume = createSprintPlume(parent, REAR_PORTS, vehicle, ground ? road : undefined), part = name => parent.getObjectByName(name);
  return { vehicle, parent, plume, jets: plume.jets, core: part('Sprint plume core'), flare: part('Sprint nozzle flare'), glow: part('Sprint road glow') };
}
/** [jets, core, flare, road glow] */
const shown = ({ jets, core, flare, glow }) => [jets.some(jet => jet.visible), core.visible, flare.visible, glow.visible];

test('modes: which parts show on each tier, off the road, on the void skin and with VFX Off', () => {
  const cases = [['VFX Off', { enabled: false }, [false, false, false, false]], ['no sprint', { power: 0 }, [false, false, false, false]],
    ['Low', { quality: 0.25 }, [true, true, true, false]], ['Medium', { quality: 0.5 }, [true, true, true, true]], ['High', {}, [true, true, true, true]],
    ['airborne', { grounded: false }, [true, true, true, false]], ['not racing', { racing: false }, [true, true, true, false]],
    ['void skin', { voidPulse: true }, [false, false, true, true]]];
  for (const [name, over, expected] of cases) {
    const parts = rig();
    parts.plume.update(frame(over));
    assert.deepEqual(shown(parts), expected, name);
    parts.plume.reset();
    assert.deepEqual(shown(parts), [false, false, false, false], `${name}: reset hides everything`);
  }
});

// Bloom runs above Low only (configureBloom in src/upcoming-lighting.ts). The white-out dimming then cost the phone tier
// half its exhaust area (2-core landscape BOOST 1.2-1.6x the old cone, floor 2x): with no bloom halo the jet carries its own.
test('the jet dims under the bloom threshold only where bloom runs: Low keeps its own halo', () => {
  const glare = quality => { const parts = rig(); parts.plume.update(frame({ quality })); return parts.jets.map(jet => jet.material.uniforms.glare?.value); };
  assert.deepEqual(glare(0.25), [0, 0, 0, 0], 'Low: no bloom, no dimming');
  for (const quality of [0.5, 1]) assert.deepEqual(glare(quality), [1, 1, 1, 1], `quality ${quality}: dimmed under the bloom threshold`);
});

test('x3 chain: power above 1 makes the flare no bigger, the core no more opaque and the jets no brighter', () => {
  const state = power => { const parts = rig(); parts.plume.update(frame({ power })); const flare = parts.flare.material.uniforms;
    return [flare.size.value, flare.fade.value, parts.core.material.uniforms.alpha.value, parts.glow.material.uniforms.fade.value,
      ...parts.jets.map(jet => jet.material.uniforms.power.value)]; }; // jets: the veil guard runs at chain 1 only
  assert.deepEqual(state(1.4), state(1));
  assert.ok(Math.abs(state(1)[0] - PLUME.flare) < 1e-9 && Math.abs(state(0.5)[0] - PLUME.flare * 0.775) < 1e-9, 'flare size is PLUME.flare * (0.55 + 0.45 * power)');
});

test('trail skin: its NITRO trail replaces the fat flame and the road glow; BOOST and calm modes keep them', () => {
  const tint = [1, 0.5, 0.25], accent = new Vector4(1, 0.25, 0.5, 1);
  const state = (trailStyle, over) => {
    const parts = rig();
    parts.plume.setSkin(tint, 0, accent, trailStyle);
    parts.plume.update(frame(over));
    for (const mesh of [parts.core, parts.flare, parts.glow]) {
      assert.deepEqual(mesh.material.uniforms.skinTint.value.toArray(), tint, `${mesh.name} takes the thruster tint`);
      assert.ok(mesh.material.uniforms.trailAccent.value.equals(accent), `${mesh.name} takes the trail accent`);
      assert.equal(mesh.material.uniforms.nitroMix.value, over.nitroMix);
    }
    return { thick: parts.jets.map(jet => jet.material.uniforms.thick.value), core: parts.core.material.uniforms.alpha.value,
      glow: parts.glow.material.uniforms.fade.value, flare: parts.flare.material.uniforms.fade.value };
  };
  const nitro = state(2, { nitroMix: 1 }), boost = state(2, { nitroMix: 0 }), calm = state(2, { nitroMix: 1, calm: true }), plain = state(0, { nitroMix: 1 });
  assert.deepEqual([nitro.thick, nitro.core, nitro.glow], [[0, 0, 0, 0], 0, 0], 'NITRO with a trail skin: the old cone, no core, no glow');
  assert.ok(nitro.flare > 0, 'the nozzle flare stays');
  for (const [name, kept] of [['BOOST', boost], ['calm', calm], ['no trail skin', plain]]) {
    assert.deepEqual(kept.thick, [1, 1, 1, 1], name);
    assert.equal(kept.core, 0.85, name);
    assert.ok(kept.glow > 0, name);
  }
  assert.ok(Math.abs(calm.flare - 0.6 * boost.flare) < 1e-9 && Math.abs(calm.glow - 0.6 * boost.glow) < 1e-9, 'Reduced Motion / Comfortable: 0.6 times');
});

// Trap: the car banks, and squats on its rear tyres during the very sprint that shows the glow. A plane 7 m long that
// leans with the car sinks under the road behind it and the depth test removes it.
test('lean: the road glow lies on the road while the car banks and squats', () => {
  const q = new Quaternion(), corner = new Vector3();
  const normal = parts => { parts.vehicle.updateMatrixWorld(true); return new Vector3(0, 0, 1).applyQuaternion(parts.glow.getWorldQuaternion(q)).toArray(); };
  const near = (actual, expected, name) => actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-6, `${name}: ${actual} vs ${expected}`));
  const heights = parts => { const at = parts.glow.geometry.attributes.position;
    return Array.from({ length: at.count }, (_, i) => parts.glow.localToWorld(corner.fromBufferAttribute(at, i)).y); };
  for (const [name, lean] of [['banked', { roll: 0.2 }], ['squatting', { pitch: 0.05 }], ['nose down', { pitch: -0.05, roll: -0.1 }]]) {
    const parts = rig(lean);
    parts.parent.position.set(0, 0.1, 0.2); // garage-model.ts moves `Rear ports` onto a dressed GLB's nozzles
    parts.plume.update(frame());
    near(normal(parts), [0, 1, 0], name);
    near(heights(parts), [0.04, 0.04, 0.04, 0.04], `${name}: 4 cm above the road at every corner`);
  }
  const loose = rig({ roll: 0.2, ground: false });
  loose.parent.position.set(0, 0.1, 0.2);
  loose.plume.update(frame());
  near(normal(loose), [-Math.sin(0.2), Math.cos(0.2), 0], 'no ground: flat in the car frame');
  loose.vehicle.rotation.set(0, 0, 0);
  loose.plume.update(frame());
  loose.vehicle.updateMatrixWorld(true);
  near(heights(loose), [0.04, 0.04, 0.04, 0.04], 'no ground: 4 cm above the car frame floor');
});

test('layers: flare and road glow are additive and depth-tested, three meshes join the jets hidden', () => {
  const { parent, core, flare, glow } = rig();
  assert.deepEqual(parent.children.filter(child => !child.name.startsWith('Cold gas nozzle')).map(child => child.name).sort(),
    ['Sprint nozzle flare', 'Sprint plume core', 'Sprint road glow'], 'three extra draw calls at most');
  assert.ok([core, flare, glow].every(mesh => !mesh.visible), 'hidden from creation: the world warm-up compiles them');
  assert.ok(flare.isInstancedMesh && flare.count === 4, 'one flare per nozzle in one draw call');
  assert.ok(glow.isMesh && !glow.isInstancedMesh);
  assert.equal(glow.renderOrder, 1);
  assert.deepEqual([glow.geometry.parameters.width, glow.geometry.parameters.height], [PLUME.glowWidth, PLUME.glowLength]);
  for (const { name, material } of [flare, glow]) assert.deepEqual([material.blending, material.transparent, material.depthTest, material.depthWrite], [AdditiveBlending, true, true, false], name);
  assert.match(flare.material.vertexShader, /centre\.xyz-=normalize\(centre\.xyz\)\*/, 'pulled towards the eye in view space: the tail must not cut the flare in half');
  for (const { material } of [flare, glow]) assert.doesNotMatch(material.fragmentShader, /brightness/, 'no coreBrightness term');
});

test('createAeroVFX tells the plume about the tier, the road and Reduced Motion', () => {
  const road = heldNitro({ quality: 'high', preset: 'realistic' }), air = heldNitro({ quality: 'high', preset: 'realistic' }, undefined, { altitude: 6 });
  assert.deepEqual(shown(road), [true, true, true, true]);
  assert.deepEqual(shown(air), [true, true, true, false], 'airborne: no road to light');
  const calm = heldNitro({ quality: 'high', preset: 'realistic' }, undefined, { reducedMotion: true });
  assert.deepEqual(shown(calm), [true, true, true, true], 'Reduced Motion keeps a static plume');
  assert.ok(Math.abs(calm.flare.material.uniforms.fade.value - 0.6 * road.flare.material.uniforms.fade.value) < 1e-9, 'at 0.6 times');
  // Low + Realistic, the 2-core phone: flare size and fade are the ones High + Extreme gets.
  const phone = heldNitro({ quality: 'low', preset: 'realistic' }).flare.material.uniforms, desk = heldNitro({ quality: 'high', preset: 'extreme' }).flare.material.uniforms;
  assert.deepEqual([phone.size.value, phone.fade.value], [desk.size.value, desk.fade.value]);
});
