import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3 } from 'three';
import { createAeroVFX, REAR_PORTS } from '../src/aero-vfx.js';
import { createRace } from '../src/game.js';
import { vfxSettings } from '../src/vfx-settings.ts';

// Each NITRO trail skin is its own show: a hot flame at every exhaust, long light streaks behind it and the
// glow they throw on the road, with a signature motion per skin (laser, pulse, dash, twin nebula ribbons).
const TRAILS = { 'nitro-trail-cyan': 1, 'nitro-trail-gold': 2, 'nitro-trail-red': 3, 'nitro-trail-purple': 4 };

function rig(skin, { settings = vfxSettings({ enabled: true, quality: 'high' }), reducedMotion = false, nitro = true } = {}) {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  scene.add(car);
  const aero = createAeroVFX(scene, car), race = createRace();
  aero.setSkins(skin ? { 'nitro-trail': skin } : {});
  race.phase = 'racing'; race.player.speed = 90; race.player.boosting = false;
  race.player.nitroTime = nitro ? 3 : 0; race.player.miniBoost = nitro ? 0 : 3;
  const step = () => aero.update(race, 1 / 30, new Vector3(), settings, reducedMotion);
  for (let i = 0; i < 6; i++) step();
  return { car, aero, race, step, streaks: car.getObjectByName('NITRO trail streaks'), pool: car.getObjectByName('NITRO trail road glow') };
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
