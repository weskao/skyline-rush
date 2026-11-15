// Task 5b step 3, runtime half: Neon Downtown under `?look=3d` on Medium+ is lit by the two night HDRIs that
// assets-src/neon-sky/build.py ships (N2: night and rain night only). The lighting table, the dome manifest and the
// track entry must agree with that build's manifest; Low and pages without the gate stay as tests/track-look.test.js
// pins them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Color, Object3D, Vector3 } from 'three';
import { COAST_ENV_VARIANTS, coastEnvPlan } from '../src/coast-lighting.ts';
import { createCoastLook } from '../src/coast-look.ts';
import { coastSkyFile, coastSkyYaw, coastSunDirection } from '../src/coast-sky.ts';
import { COAST_SKY_MANIFEST } from '../src/coast-sky-manifest.ts';
import { setLook3d } from '../src/look-gate.ts';

const SHIPPED = JSON.parse(readFileSync(new URL('../assets-src/neon-sky/manifest.json', import.meta.url), 'utf8')).environments;
const VARIANTS = [['night', SHIPPED.night], ['nightRain', SHIPPED.rain]];
const SKYLINE_LONGITUDE = 30; // degrees in the HDRI frame: the far Pudong skyline (assets-src/neon-sky/README.md)

test('Neon Medium+ plans the rain-night HDRI on its rainy default and in rain, the night HDRI at night, nothing else', t => {
  t.after(() => setLook3d(false));
  setLook3d(true);
  for (const quality of ['medium', 'high']) {
    for (const preset of ['track', 'rain']) assert.deepEqual(coastEnvPlan('neon', preset, quality), { kind: 'hdri', variant: 'nightRain' }, `${preset} ${quality}`);
    assert.deepEqual(coastEnvPlan('neon', 'night', quality), { kind: 'hdri', variant: 'night' }, quality);
    for (const preset of ['day', 'dusk', 'fog', 'snow', 'aurora']) assert.deepEqual(coastEnvPlan('neon', preset, quality), { kind: 'room' }, `${preset} ${quality}`);
  }
  assert.deepEqual(coastEnvPlan('coast', 'night', 'high'), { kind: 'room' }, "Coast has no night look: Neon's variant is not borrowed");
});

for (const [name, shipped] of VARIANTS) {
  test(`${name}: the lighting row and the dome rows are the shipped build's files, credit and measurements`, () => {
    const v = COAST_ENV_VARIANTS[name];
    assert.equal(v.file, shipped.file);
    assert.deepEqual({ ...v.credit }, shipped.credit);
    assert.deepEqual(COAST_SKY_MANIFEST.skies[name].files, shipped.files);
    for (const file of shipped.files) assert.equal(coastSkyFile(name, file.width).sha256, file.sha256);
    const sources = Object.fromEntries(Object.entries(shipped.inputSha256).filter(([file]) => !file.endsWith('_1k.hdr')));
    assert.deepEqual(COAST_SKY_MANIFEST.skies[name].inputSha256, sources);
    assert.equal(v.sky.range, shipped.range);
    assert.equal(v.sky.disc, 0, 'no sun disc at night');
    assert.deepEqual([...v.sky.sunDirection], shipped.key.direction, 'the key light shines from the measured key, not from one bright sign');
    assert.equal(v.sun.color, shipped.key.color);
    assert.ok(v.sun.intensity > 0 && v.sun.intensity <= shipped.key.intensity, 'the measured key, scaled by the environment intensity');
    assert.ok(Math.abs(v.sky.gain - Math.min(1, v.bloom.threshold / shipped.sky.p90Band0to40)) < 5e-3, 'the lit skyline sits at the bloom threshold');
    assert.ok(v.radianceCap >= 1 && v.radianceCap <= v.sky.range, 'sign texels are capped so the wet road does not mirror them as white blots');
  });

  test(`${name}: one yaw puts the far skyline straight ahead of the grid and turns the key light with it`, () => {
    const turned = new Object3D();
    turned.rotation.y = coastSkyYaw(name); turned.updateMatrixWorld();
    const longitude = SKYLINE_LONGITUDE * Math.PI / 180;
    const skyline = new Vector3(Math.cos(longitude), 0, Math.sin(longitude)).applyMatrix4(turned.matrixWorld);
    assert.ok(skyline.distanceTo(new Vector3(0, 0, -1)) < 1e-6, 'the car drives toward -z');
    const key = new Vector3(...COAST_ENV_VARIANTS[name].sky.sunDirection).normalize().applyMatrix4(turned.matrixWorld);
    assert.ok(key.distanceTo(coastSunDirection(name)) < 1e-6, 'the light, the environment and the dome turn together');
  });
}

test('rain night is the dimmer of the two, and both bloom their lights harder than the 0.42 Neon had', () => {
  const night = COAST_ENV_VARIANTS.night, rain = COAST_ENV_VARIANTS.nightRain;
  assert.ok(rain.sun.intensity < night.sun.intensity && rain.intensity <= night.intensity);
  for (const v of [night, rain]) assert.ok(v.bloom.strength > 0.42);
});

// Trap (2026-11-15): the page opens on Coast, so Coast's day HDRI is up when Neon is selected. While Neon's own HDRI
// was loading, and for good when it failed, the night city stayed lit by Coast's daylight (environmentIntensity 0.9).
test('another track\'s HDRI never lights Neon: RoomEnvironment until its own lands, and for good when it fails', async t => {
  t.after(() => setLook3d(false));
  setLook3d(true);
  const room = { id: 'room' }, textures = { day: { id: 'day' } }, releases = [];
  const envs = { get: name => textures[name], preload: () => new Promise(resolve => releases.push(resolve)) };
  const scene = { environment: room, environmentIntensity: 0.42 };
  const look = createCoastLook({
    scene, renderer: { toneMappingExposure: 1 }, room, roomIntensity: 0.42, envs,
    lens: { uniforms: { saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color() } } },
  });
  look.update('coast', 'day', 'high');
  assert.equal(scene.environment, textures.day);
  look.update('neon', 'track', 'high');
  assert.deepEqual([scene.environment, scene.environmentIntensity, look.bloomStrength(.42)], [room, 0.42, .42], 'while loading');
  releases[0](); await new Promise(resolve => setImmediate(resolve)); // the load failed: nothing to get
  assert.deepEqual([scene.environment, scene.environmentIntensity], [room, 0.42], 'after a failed load');
  textures.night = { id: 'night' };
  look.update('neon', 'night', 'high');
  assert.equal(scene.environment, textures.night, 'a variant that is ready still swaps in at once');
});

test('the bloom of a Neon race is its variant\'s once the HDRI is up, and world.js asks the look for it on every track', async t => {
  t.after(() => setLook3d(false));
  setLook3d(true);
  const sun = { color: new Color('#112233'), intensity: 1, position: new Vector3(0, 10, 0) };
  const scene = { environment: null, environmentIntensity: 1, environmentRotation: { y: 0 } };
  const look = createCoastLook({
    scene, renderer: { toneMappingExposure: 1 }, room: null, roomIntensity: 0.42, sun,
    lens: { uniforms: { saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color() } } },
    envs: { get: name => ({ name }), preload: async () => {} },
  });
  assert.equal(look.bloomStrength(.42), .42, 'before any HDRI: the caller\'s own');
  look.update('neon', 'track', 'high');
  const v = COAST_ENV_VARIANTS.nightRain;
  assert.deepEqual(scene.environment, { name: 'nightRain' });
  assert.equal(look.bloomStrength(.42), v.bloom.strength);
  assert.equal(look.bloomThreshold(1.1), v.bloom.threshold);
  assert.equal(scene.environmentRotation.y, coastSkyYaw('nightRain'));
  assert.equal(sun.intensity, v.sun.intensity);
  look.update('neon', 'day', 'high'); // N2: no day look, the track's own sun and RoomEnvironment return
  assert.deepEqual([scene.environment, sun.intensity, look.bloomStrength(.42)], [null, 1, .42]);
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(world, /coastLook\.bloomStrength\(trackId === 'coast' \? COAST_LIGHTING\.bloom : \.42\)/);
});
