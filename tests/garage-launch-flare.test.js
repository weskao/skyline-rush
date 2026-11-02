import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Group, Mesh, BoxGeometry, Vector3 } from 'three';
import { createAeroVFX } from '../src/aero-vfx.js';
import { createRace } from '../src/game.js';
import { vfxSettings } from '../src/vfx-settings.ts';
import { LAUNCH_FLARE_STYLES } from '../src/garage-launch-flare-styles.ts';
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
