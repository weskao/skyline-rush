import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3 } from 'three';
import { createAeroVFX, REAR_PORTS } from '../src/aero-vfx.js';
import { createRace } from '../src/game.js';
import * as sprintVfx from '../src/vfx-settings.ts';

const { createSprintVfx, vfxSettings } = sprintVfx;

// Each NITRO trail skin is its own show: a hot flame at every exhaust, long light streaks behind it and the
// glow they throw on the road, with a signature motion per skin (laser, pulse, dash, twin nebula ribbons).
const TRAILS = { 'nitro-trail-cyan': 1, 'nitro-trail-gold': 2, 'nitro-trail-red': 3, 'nitro-trail-purple': 4 };

function rig(skin, { settings = vfxSettings({ enabled: true, quality: 'high' }), reducedMotion = false, nitro = true, altitude = 0, chain = 1 } = {}) {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(car);
  const ground = new Group(); ground.rotation.x = -Math.PI / 2;
  const aero = createAeroVFX(scene, car, ground), race = createRace();
  aero.setSkins(skin ? { 'nitro-trail': skin } : {});
  race.phase = 'racing'; race.player.speed = 90; race.player.boosting = false;
  race.player.nitroTime = nitro ? 3 : 0; race.player.miniBoost = nitro ? 0 : 3;
  race.player.altitude = altitude;
  const sprint = createSprintVfx(), origin = new Vector3();
  const step = () => aero.update(race, 1 / 30, origin, settings, reducedMotion, sprint.update({
    phase: 'racing', nitro, boost: !nitro, speed: 90, cap: 110, dt: 1 / 30,
    enabled: settings.enabled, quality: settings.quality, reducedMotion, chain,
  }));
  for (let i = 0; i < 6; i++) step();
  return { car, aero, race, step, sprint, streaks: car.getObjectByName('NITRO trail streaks'), pool: car.getObjectByName('NITRO trail road glow') };
}

test('every NITRO trail skin shows exhaust streaks and road glow in its own style and colour', () => {
  const seen = new Set();
  for (const [skin, style] of Object.entries(TRAILS)) {
    const { car, streaks, pool } = rig(skin);
    assert.ok(streaks?.isInstancedMesh && streaks.count === REAR_PORTS.length, 'one streak per exhaust');
    assert.ok(streaks.visible && pool.visible, `${skin} shows during NITRO`);
    assert.equal(streaks.material.uniforms.style.value, style, `${skin} has its own motion`);
    const flow = car.getObjectByName('Airflow showcase').children[0];
    const accent = flow.material.uniforms.trailAccent.value;
    assert.deepEqual(streaks.material.uniforms.color.value.toArray(), [accent.x, accent.y, accent.z], 'streaks share the trail colour');
    assert.ok(streaks.material.uniforms.power.value > 0.5, 'full NITRO drives the streaks hard');
    seen.add(streaks.material.uniforms.color.value.toArray().join());
  }
  assert.equal(seen.size, 4, 'four distinct colours');
  for (const style of [1, 2, 3, 4]) {
    assert.match(rig('nitro-trail-cyan').streaks.material.fragmentShader, new RegExp(`style>${String(style - 0.5).replace(/^0/, "")}`), `shader has style ${style}`);
  }
});

test('the standard trail, BOOST without NITRO, VFX Off and Reduced Motion add no trail streaks', () => {
  for (const off of [rig(null), rig('nitro-trail-gold', { nitro: false }),
    rig('nitro-trail-gold', { settings: vfxSettings({ enabled: false }) }), rig('nitro-trail-gold', { reducedMotion: true })]) {
    assert.equal(off.streaks.visible || off.pool.visible, false);
  }
});

test('Low keeps the streaks without the road glow; the Studio previews the trail without NITRO', () => {
  const low = rig('nitro-trail-red', { settings: vfxSettings({ enabled: true, quality: 'low' }) });
  assert.ok(low.streaks.visible);
  assert.equal(low.pool.visible, false, 'Low skips the road overdraw');
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  const aero = createAeroVFX(scene, car), race = createRace();
  aero.setSkins({ 'nitro-trail': 'nitro-trail-purple' });
  race.phase = 'ready';
  for (let i = 0; i < 30; i++) aero.update(race, 1 / 30, new Vector3(), vfxSettings({ enabled: true, airflow: true }), false, null, true);
  assert.ok(car.getObjectByName('NITRO trail streaks').visible, 'Studio preview shows the selected trail');
});

test('trail streaks reuse their GPU resources: no per-frame matrix uploads, no new materials on skin swaps', () => {
  const { aero, step, streaks } = rig('nitro-trail-gold');
  const version = streaks.instanceMatrix.version, { material, geometry } = streaks;
  for (let i = 0; i < 20; i++) step();
  assert.equal(streaks.instanceMatrix.version, version);
  aero.setSkins({ 'nitro-trail': 'nitro-trail-purple' }); step();
  assert.equal(streaks.material, material); assert.equal(streaks.geometry, geometry);
  assert.equal(streaks.material.uniforms.style.value, 4);
});

test('trail colours read as their names: gold is gold, crimson is red, not lime or pink', () => {
  const hue = ([r, g, b]) => {
    const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
    const h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
    return (h + 360) % 360;
  };
  const of = skin => hue(rig(skin).streaks.material.uniforms.color.value.toArray());
  const gold = of('nitro-trail-gold'), red = of('nitro-trail-red');
  assert.ok(gold >= 32 && gold <= 50, `gold hue ${gold}`);
  assert.ok(red >= 350 || red <= 8, `crimson hue ${red}`);
});

test('each trail leaves its round exhaust nozzle as a round plume of the nozzle size, not a square sheet', () => {
  const { streaks } = rig('nitro-trail-gold');
  const position = streaks.geometry.attributes.position, mouth = new Set();
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(position.getZ(i)) > 1e-6) continue;
    assert.ok(Math.abs(Math.hypot(position.getX(i), position.getY(i)) - 1) < 1e-4, 'the mouth is a unit circle');
    mouth.add(Math.atan2(position.getY(i), position.getX(i)).toFixed(3));
  }
  assert.ok(mouth.size >= 12, `round mouth, ${mouth.size} sides`);
  assert.equal(streaks.material.uniforms.nozzleRadius.value, REAR_PORTS[0].size, 'mouth scaled to the nozzle disc');
  assert.match(streaks.material.vertexShader, /nozzleRadius\*\(1\.\+/, 'the plume grows from the nozzle radius');
  const at = new Vector3(), m = new (streaks.matrixWorld.constructor)();
  REAR_PORTS.forEach((port, i) => {
    streaks.getMatrixAt(i, m); at.setFromMatrixPosition(m);
    assert.ok(at.distanceTo(new Vector3(...port.position)) < 1e-6, `plume ${i} starts in its nozzle`);
  });
});

test('all four custom trails keep their colour and a compact steady road glow on the ground only', () => {
  for (const id of Object.keys(TRAILS)) {
    const ground = rig(id), air = rig(id, { altitude: 2 });
    assert.ok(ground.pool.visible && air.streaks.visible, id);
    assert.equal(air.pool.visible, false, id);
    assert.ok(ground.pool.scale.x <= 1.65 && ground.pool.scale.y <= 6, id);
    assert.doesNotMatch(ground.pool.material.fragmentShader, /sin|time|beat/, id);
  }
});

test('gold travels without a global brightness pulse and red fades between moving segments', () => {
  const { aero, car, streaks } = rig('nitro-trail-gold');
  const gold = streaks.material.fragmentShader;
  assert.doesNotMatch(gold, /sin\(time|nozzle\*=/);
  const red = gold.split('if(style>2.5&&style<3.5)')[1].split('if(style>3.5)')[0];
  assert.match(red, /smoothstep/);
  assert.doesNotMatch(red, /\bstep\(/);
  const flare = car.getObjectByName('Sprint nozzle flare').material.fragmentShader;
  assert.match(flare, /1\.-clamp\(nitroMix/, 'shared nozzle flicker fades out during NITRO');
  const wake = aero.worldEffects.getObjectByName('Continuous dash ribbon').material.fragmentShader;
  assert.doesNotMatch(wake, /skinPattern>2\.5\)shape=step\(/, 'the secondary red wake has soft edges too');
});

test('chained NITRO lengthens and moves the tail faster without increasing trail, plume or bloom power', () => {
  const settings = vfxSettings({ airflow: true, airflowOpacity: .2, speedLines: 1 });
  const first = rig('nitro-trail-gold', { settings }), full = rig('nitro-trail-gold', { settings, chain: 3 });
  for (let i = 0; i < 24; i++) { first.step(); full.step(); }
  const one = first.streaks.material.uniforms, three = full.streaks.material.uniforms;
  assert.ok(three.trailLength.value > one.trailLength.value + 1);
  assert.ok(three.time.value > one.time.value);
  assert.equal(three.power.value, one.power.value);
  const nozzle = rig => rig.car.getObjectByName('Cold gas nozzle 1').material.uniforms.power.value;
  assert.equal(nozzle(full), nozzle(first));
  const airflowPower = rig => rig.car.getObjectByName('Airflow showcase').children[0].material.uniforms.power.value;
  assert.equal(airflowPower(full), airflowPower(first), 'visible airflow shares the same light ceiling');
  const { sprintBloomBoost } = sprintVfx;
  assert.equal(sprintBloomBoost(first.sprint.frame, 1.5, 1), sprintBloomBoost(full.sprint.frame, 1.5, 1));
  assert.ok(sprintBloomBoost(full.sprint.frame, 1.5, 1) <= 0.06);
});

test('Comfort keeps the equipped NITRO tint in a steady dim nozzle without its road wash', () => {
  for (const id of Object.keys(TRAILS)) {
    const { car, streaks, pool, step } = rig(id, { settings: vfxSettings({ comfortable: true }) });
    const jet = car.getObjectByName('Cold gas nozzle 1'), u = jet.material.uniforms;
    assert.ok(jet.visible && !streaks.visible && !pool.visible, id);
    assert.equal(u.trailAccent.value.w, 1, id);
    assert.ok(u.brightness.value <= .65, id);
    const t = u.time.value; step(); assert.equal(u.time.value, t, id);
    assert.equal(car.getObjectByName('Sprint road glow').visible, false, id);
  }
});

test('the compact reflection stays on the road when a fitted car pitches and banks', () => {
  const { car, pool, step } = rig('nitro-trail-purple');
  car.getObjectByName('Rear ports').position.set(.05, .35, .15);
  car.rotation.set(.16, 0, .23);
  step(); car.updateMatrixWorld(true);
  const up = new Vector3(0, 0, 1).applyQuaternion(pool.getWorldQuaternion(pool.quaternion.clone()));
  assert.ok(up.distanceTo(new Vector3(0, 1, 0)) < 1e-6);
  assert.ok(Math.abs(pool.getWorldPosition(new Vector3()).y - .04) < 1e-6);
});

test('style filaments use the existing streak shader and do not lift its light ceilings', () => {
  const shader = rig('nitro-trail-purple').streaks.material.fragmentShader;
  assert.match(shader, /float filament=/);
  assert.match(shader, /\.66\/max\(\.66/);
  assert.match(shader, /power,0\.,\.76\)/);
});
