// Task 5b step 2: the `?look=3d` look is a per-track entry (environment, road set, scenery layer), not a
// `trackId === 'coast'` check, so a second track opts in without a copy of the Coast code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Color, Vector3 } from 'three';
import { trackLook } from '../src/track-look.ts';
import { coastEnvPlan } from '../src/coast-lighting.ts';
import { createCoastLook } from '../src/coast-look.ts';
import { createCoastAssets } from '../src/coast-assets.ts';
import { setLook3d } from '../src/look-gate.ts';

const source = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('Coast has a look entry; a track without one, and an inherited key, has none', () => {
  const coast = trackLook('coast');
  assert.deepEqual({ ...coast.env }, { track: 'day', day: 'day', dusk: 'dusk', rain: 'rain', fog: 'fog' });
  assert.equal(coast.road, 'coast-asphalt');
  assert.equal(coast.scenery, 'coast-scenery');
  assert.equal(coast.boats, 'coast-boats');
  for (const id of ['canyon', 'circuit', 'toString', '__proto__', '']) assert.equal(trackLook(id), undefined, id);
});

test('the lighting plan, the look and the asset host read the entry, never the track id', () => {
  for (const file of ['coast-lighting.ts', 'coast-look.ts', 'coast-assets.ts']) assert.doesNotMatch(source(file), /=== 'coast'/, file);
});

test('Neon without ?look=3d, Neon on Low and Coast under ?look=3d plan as before', t => {
  t.after(() => setLook3d(false));
  setLook3d(false);
  for (const quality of ['low', 'medium', 'high']) for (const preset of ['track', 'night', 'rain'])
    assert.deepEqual(coastEnvPlan('neon', preset, quality), { kind: 'room' }, `no gate: neon ${preset} ${quality}`);
  setLook3d(true);
  for (const preset of ['track', 'night', 'rain']) assert.deepEqual(coastEnvPlan('neon', preset, 'low'), { kind: 'room' }, `Low: neon ${preset}`);
  assert.deepEqual(coastEnvPlan('coast', 'track', 'high'), { kind: 'hdri', variant: 'day' });
  assert.deepEqual(coastEnvPlan('coast', 'rain', 'medium'), { kind: 'hdri', variant: 'rain' });
  assert.deepEqual(coastEnvPlan('coast', 'track', 'low'), { kind: 'room' });
  assert.deepEqual(coastEnvPlan('coast', 'night', 'high'), { kind: 'room' });
});

test('a track without an entry never asks the asset host for a model or a road', () => {
  const loads = [], dataset = {};
  const assets = createCoastAssets({
    scenery: { attachModel() {}, detachModel() {}, attachBoats() {}, detachBoats() {} }, boatClock: { value: 0 },
    cache: { load: id => { loads.push(id); return new Promise(() => {}); } },
    road: { mesh: { material: {} }, load: file => { loads.push(file.url); return new Promise(() => {}); } }, dataset,
  });
  for (const quality of ['low', 'medium', 'high']) assert.equal(assets.update('neon', quality, false, 'rain'), false);
  assert.deepEqual(loads, []);
  assets.update('coast', 'high', false);
  assert.deepEqual(loads.slice(0, 2), ['coast-scenery', 'coast-boats']);
  assert.equal(loads.length, 5, 'scenery, boats and the three road textures');
  assets.dispose();
});

test('the sun a look borrowed goes back only to the track it was borrowed from', t => {
  t.after(() => setLook3d(false));
  setLook3d(true);
  const sun = { color: new Color('#112233'), intensity: 1, position: new Vector3(0, 10, 0) };
  const look = createCoastLook({
    scene: { environment: null, environmentIntensity: 1 }, renderer: { toneMappingExposure: 1 }, room: null, roomIntensity: 1, sun,
    lens: { uniforms: { saturation: { value: 1 }, contrast: { value: 1 }, tint: { value: new Color() } } },
    envs: { get: () => ({}), preload: async () => {} },
  });
  look.update('coast', 'track', 'high');
  assert.notEqual(sun.intensity, 1, 'the HDRI sun');
  look.update('coast', 'night', 'high'); // still on Coast, no HDRI: its own sun returns
  assert.equal(sun.intensity, 1);
  look.update('coast', 'track', 'high');
  sun.intensity = 3; // world.js sets the next track's sun on a track change, just before update
  look.update('neon', 'track', 'high');
  assert.equal(sun.intensity, 3, 'the new track keeps the sun its own block set');
});
