import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3, Quaternion, Euler } from 'three';
import { createAeroVFX } from '../src/aero-vfx.js';
import { createRace } from '../src/game.js';
import { vfxSettings } from '../src/vfx-settings.ts';
import { LAUNCH_FLARE_STYLES } from '../src/garage-launch-flare-styles.ts';
import * as flareShaders from '../src/garage-launch-flare-shaders.js';
import { skinVfxPalette } from '../src/garage-skin-palette.ts';

const FLARES = ['launch-flare-blue', 'launch-flare-ring', 'launch-flare-pulse', 'launch-flare-gold',
  'launch-flare-red', 'launch-flare-cyan', 'launch-flare-magenta', 'launch-flare-white'];

function hsv([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const h = d === 0 ? 0 : max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { hue: (h + 360) % 360, saturation: max ? d / max : 0 };
}
const hueIn = (rgb, from, to) => { const { hue } = hsv(rgb); return from <= to ? hue >= from && hue <= to : hue >= from || hue <= to; };

// Shapes and hues read off each 3x badge (public/feature-assets/garage-vfx-skins/raster/flare-*@3x.webp).
test('each launch flare matches its badge: silhouette, signature motion and colour', () => {
  const expected = {
    'launch-flare-blue': ['starburst', [200, 235]],
    'launch-flare-ring': ['ring', [285, 325]],
    'launch-flare-pulse': ['starburst', [255, 285]],
    'launch-flare-gold': ['starburst', [28, 52]],
    'launch-flare-red': ['streak', [350, 12]],
    'launch-flare-cyan': ['fan', [182, 200]],
    'launch-flare-magenta': ['fan', [300, 330]],
  };
  for (const [id, [shape, [from, to]]] of Object.entries(expected)) {
    const style = LAUNCH_FLARE_STYLES[id];
    assert.equal(style?.shape, shape, `${id} silhouette`);
    assert.ok(hueIn(style.primary, from, to), `${id} primary hue ${hsv(style.primary).hue}`);
    assert.deepEqual(skinVfxPalette({ 'launch-flare': id })['launch-flare'], style.primary, `${id} shockwave tint shares the style colour`);
  }
  const white = LAUNCH_FLARE_STYLES['launch-flare-white'];
  assert.equal(white.shape, 'fan');
  assert.ok(hsv(white.primary).saturation < 0.2, 'white supernova is white');
  assert.ok(hueIn(white.secondary, 210, 240), 'with the steel-blue fringe of its badge');
  assert.ok(hueIn(LAUNCH_FLARE_STYLES['launch-flare-ring'].secondary, 215, 245), 'ring badge: magenta outer, blue inner ring');
  assert.ok(LAUNCH_FLARE_STYLES['launch-flare-pulse'].pulse > 0, 'Pulse flare throbs');
  assert.ok(LAUNCH_FLARE_STYLES['launch-flare-gold'].corona > 0, 'Solar corona has a flame corona');
  assert.ok(LAUNCH_FLARE_STYLES['launch-flare-magenta'].swirl > 0, 'Magenta vortex spirals');
  assert.ok(white.core > Math.max(...FLARES.slice(0, -1).map(id => LAUNCH_FLARE_STYLES[id].core)), 'supernova has the brightest core');
  assert.equal(new Set(FLARES.map(id => JSON.stringify(LAUNCH_FLARE_STYLES[id]))).size, FLARES.length, 'no two flares look alike');
});

function rig() {
  const scene = new Scene(), car = new Group();
  car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
  car.add(car.userData.body); scene.add(car);
  return { scene, car, aero: createAeroVFX(scene, car), race: createRace() };
}
const launch = (aero, race, settings) => {
  race.phase = 'countdown'; aero.update(race, 0.05, new Vector3(), settings, false);
  race.phase = 'racing'; aero.update(race, 0.05, new Vector3(), settings, false);
};

test('a launch flare bursts behind the car and lights the whole body in its colours', () => {
  const { scene, car, aero, race } = rig();
  const burst = scene.getObjectByName('Launch flare burst'), glow = scene.getObjectByName('Launch flare body glow');
  assert.ok(burst && glow, 'burst and body glow exist before racing so their shaders warm up');
  assert.equal(glow.parent, car.userData.body, 'glow rides on the car body');
  assert.equal(glow.geometry, car.userData.body.geometry, 'glow reuses the body geometry');
  assert.equal(burst.visible || glow.visible, false);
  const materials = [burst.material, glow.material];
  const settings = vfxSettings({ enabled: true, quality: 'high' });
  for (const id of FLARES) {
    aero.reset(); aero.setSkins({ 'launch-flare': id });
    launch(aero, race, settings);
    assert.ok(burst.visible && glow.visible, `${id} burst and body glow at race start`);
    assert.ok(burst.material.uniforms.power.value > 0);
    assert.deepEqual(burst.material.uniforms.primary.value.toArray(), [...LAUNCH_FLARE_STYLES[id].primary]);
    assert.equal(burst.material.uniforms.shape.value, ['starburst', 'ring', 'streak', 'fan'].indexOf(LAUNCH_FLARE_STYLES[id].shape));
    assert.deepEqual([burst.material, glow.material], materials, 'one shared program for every flare');
    assert.equal(aero.inspectCosmetics().launchPreviewActive, true);
  }
  for (let i = 0; i < 120; i++) aero.update(race, 1 / 60, new Vector3(), settings, false);
  assert.equal(burst.visible || glow.visible, false, 'a race launch flares once, then fades');
});

test('basic flare, VFX Off and Reduced Motion never show the burst; Low keeps it without the body glow', () => {
  const { scene, aero, race } = rig();
  const burst = scene.getObjectByName('Launch flare burst'), glow = scene.getObjectByName('Launch flare body glow');
  aero.setSkins({ 'launch-flare': 'launch-flare-basic' });
  launch(aero, race, vfxSettings({ enabled: true }));
  assert.equal(burst.visible || glow.visible, false);
  aero.reset(); aero.setSkins({ 'launch-flare': 'launch-flare-gold' });
  launch(aero, race, vfxSettings({ enabled: false }));
  assert.equal(burst.visible || glow.visible, false);
  aero.reset();
  race.phase = 'countdown'; aero.update(race, 0.05, new Vector3(), vfxSettings({ enabled: true }), true);
  race.phase = 'racing'; aero.update(race, 0.05, new Vector3(), vfxSettings({ enabled: true }), true);
  assert.equal(burst.visible || glow.visible, false);
  aero.reset();
  launch(aero, race, vfxSettings({ enabled: true, quality: 'low' }));
  assert.equal(burst.visible, true);
  assert.equal(glow.visible, false);
});

test('Studio previews loop every flare without touching race state', () => {
  const { scene, aero, race } = rig();
  const burst = scene.getObjectByName('Launch flare burst');
  race.phase = 'ready';
  const before = structuredClone(race), settings = vfxSettings({ enabled: true, airflow: true });
  for (const id of FLARES) {
    aero.setSkins({ 'launch-flare': id });
    let starts = 0, was = false;
    for (let n = 0; n < 300; n++) {
      aero.update(race, 1 / 60, new Vector3(), settings, false, null, true);
      if (burst.visible && !was) starts++;
      was = burst.visible;
    }
    assert.ok(starts >= 2, `${id} loops in the Studio (${starts})`);
  }
  assert.deepEqual(race, before);
});



test('the car occludes the ground pool by depth while the pool composites after road-level layers', () => {
  const { scene, aero, race } = rig();
  const settings = vfxSettings({ enabled: true, quality: 'high' });
  const pool = scene.getObjectByName('Launch flare burst');
  const bodyGlow = scene.getObjectByName('Launch flare body glow');
  const threeD = ['Launch flare rays', 'Launch flare rings', 'Launch flare sparks'];
  for (const id of FLARES) {
    aero.reset(); aero.setSkins({ 'launch-flare': id });
    launch(aero, race, settings);
    assert.ok(pool.visible, `${id}: ground pool is visible`);
    assert.equal(pool.material.depthTest, true, `${id}: every car body must occlude the ground pool`);
    assert.equal(pool.material.depthWrite, false, `${id}: the pool must not write depth`);
    assert.ok(pool.renderOrder > 0, `${id}: the pool composites after shadows and transparent road markings`);
    assert.doesNotMatch(pool.material.fragmentShader, /carMask/, `${id}: depth hides the pool behind the car, not a footprint cut-out`);
    for (const name of threeD) {
      const part = scene.getObjectByName(name);
      assert.ok(part, `${id}: ${name} exists`);
      assert.equal(part.material.depthTest, true, `${id}: the car must occlude ${name}`);
      assert.equal(part.material.depthWrite, false, `${id}: ${name} cannot hide later effects`);
      assert.equal(part.renderOrder, 0, `${id}: ${name} retains normal scene sorting`);
    }
    assert.equal(bodyGlow.material.depthTest, true, `${id}: body glow stays depth tested`);
  }
});

// The quad used to end 0.25 m past the lane line with the glow still visible: a straight cut that read as the next lane covering it.
test('the ground pool outreaches its ripple and fades out before the quad ends', () => {
  const { scene } = rig();
  const pool = scene.getObjectByName('Launch flare burst');
  const { POOL_SPREAD } = flareShaders, footprint = [1.1 * 5, 2.2 * 3.6], rippleReach = 1.5; // glow footprint in metres; the ripple front runs to age * 1.5 footprints
  assert.ok(POOL_SPREAD >= rippleReach, 'the quad reaches past the furthest ripple front');
  assert.deepEqual([pool.scale.x, pool.scale.y], footprint.map(size => size * POOL_SPREAD), 'the quad grows by the spread');
  assert.ok(pool.material.fragmentShader.includes(`*${POOL_SPREAD.toFixed(1)};`), 'the shader rescales with the quad, so glow and ripple keep their size');
  assert.ok(1.4 * 1.5 * Math.exp(-2.6 * POOL_SPREAD ** 2) < 1 / 255, 'the glow is under one 8-bit step at the nearest quad edge');
});

// The car leans about its wheels; a pool leaning with it sank under the road on the side it leaned towards.
test('the ground pool stays on the road plane while the car banks and pitches', () => {
  const settings = vfxSettings({ enabled: true, quality: 'high' });
  const poolAxes = (road, lean) => {
    const scene = new Scene(), car = new Group(), ground = new Group();
    car.userData.body = new Mesh(new BoxGeometry(2, 1, 4));
    car.add(car.userData.body); scene.add(car, ground);
    ground.quaternion.copy(road).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2)); // the contact shadow's pose
    car.quaternion.copy(road).multiply(lean);
    const aero = createAeroVFX(scene, car, lean === LEVEL ? undefined : ground), race = createRace();
    aero.setSkins({ 'launch-flare': 'launch-flare-white' }); launch(aero, race, settings);
    scene.updateMatrixWorld(true);
    const pool = scene.getObjectByName('Launch flare burst');
    return { normal: new Vector3(0, 0, 1).transformDirection(pool.matrixWorld), length: new Vector3(0, 1, 0).transformDirection(pool.matrixWorld) };
  };
  const LEVEL = new Quaternion(), lean = new Quaternion().setFromEuler(new Euler(-0.06, 0, 0.045)); // thrust pitch + full steering bank
  const roads = { flat: new Quaternion().setFromEuler(new Euler(0, -0.56, 0)), 'sloped and banked': new Quaternion().setFromEuler(new Euler(0.035, -0.96, 0.03)) };
  for (const [name, road] of Object.entries(roads)) {
    const up = new Vector3(0, 1, 0).applyQuaternion(road), forward = new Vector3(0, 0, -1).applyQuaternion(road);
    const { normal, length } = poolAxes(road, lean);
    assert.ok(normal.distanceTo(up) < 1e-6, `${name} road: the pool faces the road normal, not the leaning car's (off by ${normal.distanceTo(up)})`);
    assert.ok(length.dot(forward) > 0.998, `${name} road: the pool still points along the car`);
    assert.ok(poolAxes(road, LEVEL).normal.distanceTo(up) < 1e-6, `${name} road: with no ground plane (Garage, Studio) the pool rides the car`);
  }
});
