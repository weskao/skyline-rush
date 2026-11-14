// Task 5b step 2: the `?look=3d` look is a per-track entry (environment, road set, scenery layer), not a
// `trackId === 'coast'` check, so a second track opts in without a copy of the Coast code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Color, MeshStandardMaterial, ShaderLib, Texture, Vector3 } from 'three';
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

test("Neon's entry puts its own asphalt set on the road: soaked on its rainy default, dry at night, never Coast's files", async () => {
  assert.equal(trackLook('neon').road, 'neon-asphalt');
  const urls = [], mesh = { material: new MeshStandardMaterial({ name: 'procedural' }) }, procedural = mesh.material;
  const dataset = {}, assets = createCoastAssets({
    scenery: { attachModel() {}, detachModel() {} }, cache: { load: () => new Promise(() => {}) },
    road: { mesh, load: file => { urls.push(file.url); return Promise.resolve(new Texture()); } }, dataset,
  });
  const settle = async (...args) => { assets.update(...args); await new Promise(done => setTimeout(done, 0)); return assets.update(...args); };
  assets.update('neon', 'low', false);
  assert.deepEqual(urls, [], 'Low keeps the procedural road');
  assert.equal(await settle('neon', 'high', false), true, 'the new road program is warmed before GO');
  assert.equal(urls.length, 3);
  for (const url of urls) assert.match(url, /^materials\/neon-asphalt\/asphalt_\w+_2k\.ktx2$/);
  const neonRoad = mesh.material, shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader };
  assert.notEqual(neonRoad, procedural);
  assert.deepEqual([dataset.coastRoad, dataset.coastRoadSet], ['high', 'neon-asphalt']);
  neonRoad.onBeforeCompile(shader, null);
  for (const [preset, wet] of [['track', true], ['rain', true], ['night', false], ['dusk', false], ['fog', false]]) { // N2: night and rain night only
    assets.update('neon', 'high', true, preset);
    assert.equal(shader.uniforms.wetness.value >= .7, wet, `neon ${preset}`);
    if (!wet) assert.equal(shader.uniforms.wetness.value, 0, `neon ${preset} is dry`);
  }
  let freed = false;
  neonRoad.addEventListener('dispose', () => { freed = true; });
  await settle('coast', 'high', false);
  assert.equal(urls.length, 6, 'Coast fetches its own set at the same tier');
  for (const url of urls.slice(3)) assert.match(url, /^materials\/coast-asphalt\//);
  assert.notEqual(mesh.material, neonRoad);
  assert.ok(freed, "Neon's textures are released once Coast's road is shown");
  assert.equal(dataset.coastRoadSet, 'coast-asphalt');
  await settle('canyon', 'high', false);
  assert.equal(mesh.material, procedural, 'a track without a look gets the procedural road back');
  assert.deepEqual([dataset.coastRoad, dataset.coastRoadSet], ['procedural', 'none']);
  assets.dispose();
});

test('a track without an entry never asks the asset host for a model or a road', () => {
  const loads = [], dataset = {};
  const assets = createCoastAssets({
    scenery: { attachModel() {}, detachModel() {}, attachBoats() {}, detachBoats() {} }, boatClock: { value: 0 },
    cache: { load: id => { loads.push(id); return new Promise(() => {}); } },
    road: { mesh: { material: {} }, load: file => { loads.push(file.url); return new Promise(() => {}); } }, dataset,
  });
  for (const quality of ['low', 'medium', 'high']) assert.equal(assets.update('canyon', quality, false, 'rain'), false);
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
