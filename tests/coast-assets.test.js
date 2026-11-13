import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCoastAssets } from '../src/coast-assets.ts';

function fakes(result = 'model') {
  const log = [];
  let resolve;
  const cache = { load: (id, opts) => { log.push(['load', id, opts?.quality]); return new Promise(r => { resolve = r; }); } };
  const handle = { kind: 'model', id: 'coast-scenery', instance: () => { log.push(['instance']); return new THREE.Group(); }, release: () => log.push(['release']) };
  const scenery = { attachModel: () => log.push(['attach']), detachModel: () => log.push(['detach']) };
  const settle = async () => { resolve(result === 'model' ? handle : { kind: 'fallback', id: 'coast-scenery', fallback: 'procedural-scenery', reason: 'network' }); await new Promise(r => setTimeout(r, 0)); };
  return { log, cache, scenery, settle };
}

test('the scenery GLB is fetched once, only for Coast on Medium+', async () => {
  const f = fakes(), assets = createCoastAssets({ scenery: f.scenery, cache: f.cache });
  assets.update('neon', 'high', false);
  assets.update('coast', 'low', false);
  assert.deepEqual(f.log, [], 'Low and other tracks load nothing');
  assets.update('coast', 'medium', false);
  assets.update('coast', 'high', false);
  assert.deepEqual(f.log, [['load', 'coast-scenery', undefined]], 'one fetch; the GLB has no per-tier LODs');
  assets.dispose();
});

test('a GLB that lands mid-race waits for the race to stop, then attaches once and asks for a shader warmup', async () => {
  const f = fakes(), assets = createCoastAssets({ scenery: f.scenery, cache: f.cache });
  assets.update('coast', 'medium', false);
  await f.settle();
  assert.equal(assets.update('coast', 'medium', true), false, 'never attach (and compile) after GO');
  assert.ok(!f.log.some(([op]) => op === 'attach'));
  assert.equal(assets.update('coast', 'medium', false), true, 'attach outside racing → warm the new programs');
  assert.equal(assets.update('coast', 'medium', false), false, 'only once');
  assert.equal(f.log.filter(([op]) => op === 'attach').length, 1);
  assets.dispose();
  assert.deepEqual(f.log.slice(-2), [['detach'], ['release']], 'leave the scene before the cache frees the GLB resources');
});

test('QA status on the canvas dataset follows the GLB from request to attach', async () => {
  const f = fakes(), dataset = {}, assets = createCoastAssets({ scenery: f.scenery, cache: f.cache, dataset });
  assets.update('coast', 'low', false);
  assert.equal(dataset.coastScenery, undefined);
  assets.update('coast', 'high', true);
  assert.equal(dataset.coastScenery, 'loading');
  await f.settle();
  assets.update('coast', 'high', true);
  assert.equal(dataset.coastScenery, 'waiting-for-race-end');
  assets.update('coast', 'high', false);
  assert.equal(dataset.coastScenery, 'attached');
  assets.dispose();
  assert.equal(dataset.coastScenery, 'off');
});

test('a failed load keeps the procedural scenery', async () => {
  const f = fakes('fallback'), dataset = {}, assets = createCoastAssets({ scenery: f.scenery, cache: f.cache, dataset });
  const warn = console.warn; console.warn = () => {};
  try {
    assets.update('coast', 'high', false);
    await f.settle();
    assert.equal(assets.update('coast', 'high', false), false);
  } finally { console.warn = warn; }
  assert.equal(dataset.coastScenery, 'fallback:network');
  assert.ok(!f.log.some(([op]) => op === 'attach'));
  assets.dispose();
  assert.ok(!f.log.some(([op]) => op === 'release'));
});

function roadFakes() {
  const log = [], defaultMaterial = new THREE.MeshStandardMaterial({ name: 'procedural' });
  const mesh = { material: defaultMaterial };
  const load = file => { log.push(file.resolution + ':' + file.map); return Promise.resolve(new THREE.Texture()); };
  return { log, mesh, defaultMaterial, road: { mesh, load } };
}
const scenery = { attachModel() {}, detachModel() {} };
const never = { load: () => new Promise(() => {}) };
const tick = () => new Promise(r => setTimeout(r, 0));

test('Coast Medium+ swaps in the KTX2 asphalt outside racing; Low and other tracks keep the procedural road', async () => {
  const r = roadFakes(), dataset = {}, assets = createCoastAssets({ scenery, cache: never, road: r.road, dataset });
  assets.update('coast', 'low', false);
  assets.update('neon', 'high', false);
  assert.deepEqual(r.log, [], 'Low and other tracks fetch no textures');
  assets.update('coast', 'medium', true);
  assert.deepEqual(r.log.sort(), ['1024:baseColor', '1024:normal', '1024:packed']);
  await tick();
  assert.equal(assets.update('coast', 'medium', true), false, 'never swap materials after GO');
  assert.equal(r.mesh.material, r.defaultMaterial);
  assert.equal(assets.update('coast', 'medium', false), true, 'the new road program is warmed before GO');
  assert.equal(r.mesh.material.name, 'coast_asphalt');
  assert.equal(dataset.coastRoad, 'medium');
  assert.equal(assets.update('coast', 'medium', false), false);
  assets.update('neon', 'medium', false);
  assert.equal(r.mesh.material, r.defaultMaterial, 'other tracks get the procedural road back');
  assets.update('coast', 'low', false);
  assert.equal(r.mesh.material, r.defaultMaterial, 'Low keeps the current road');
  assets.dispose();
});

test('leaving Medium for Ultra loads the 2K set with the detail normal; the tier not on screen is freed', async () => {
  const r = roadFakes(), assets = createCoastAssets({ scenery, cache: never, road: r.road });
  assets.update('coast', 'medium', false);
  await tick();
  assets.update('coast', 'medium', false);
  const oneK = r.mesh.material;
  let freed = false;
  oneK.addEventListener('dispose', () => { freed = true; });
  assets.update('coast', 'high', false, 'track', true);
  await tick();
  assets.update('coast', 'high', false, 'track', true);
  assert.ok(r.log.includes('2048:baseColor'));
  assert.match(r.mesh.material.customProgramCacheKey(), /detail/, 'Ultra shows the detail-normal program');
  assert.notEqual(r.mesh.material, oneK);
  assert.ok(freed, '1K textures released once the 2K road is shown');
  assets.dispose();
  assert.equal(r.mesh.material, r.defaultMaterial, 'dispose restores the procedural road');
});

test('rain soaks the road through a uniform every frame, without another warmup', async () => {
  const r = roadFakes(), assets = createCoastAssets({ scenery, cache: never, road: r.road });
  assets.update('coast', 'high', false);
  await tick();
  assets.update('coast', 'high', false);
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  r.mesh.material.onBeforeCompile(shader, null);
  assert.equal(assets.update('coast', 'high', true, 'rain'), false);
  assert.ok(shader.uniforms.wetness.value >= .7);
  assets.update('coast', 'high', true, 'day');
  assert.equal(shader.uniforms.wetness.value, 0);
  assets.dispose();
});

test('wet Coast on High mirrors the lights under the road; Medium, dry presets and dispose stop it', async () => {
  const r = roadFakes(), renders = [];
  const reflection = { uniforms: { reflectMap: { value: null }, reflectMatrix: { value: new THREE.Matrix4() }, reflectStrength: { value: 0 } },
    strength: 0, tagged: 0, setStrength(v) { this.strength = v; }, tag() { this.tagged++; }, render: (...args) => renders.push(args), dispose() {} };
  r.mesh.matrixWorld = new THREE.Matrix4().makeTranslation(0, 0.02, 0);
  const assets = createCoastAssets({ scenery, cache: never, road: r.road, reflection });
  assets.update('coast', 'high', false, 'rain');
  await tick();
  assets.update('coast', 'high', false, 'rain');
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  r.mesh.material.onBeforeCompile(shader, null);
  assert.equal(shader.uniforms.reflectStrength, reflection.uniforms.reflectStrength, 'the road samples the shared mirror');
  assert.ok(reflection.strength > 0, 'High rain turns the mirror on');
  const scene = {}, camera = {};
  r.mesh.onBeforeRender('renderer', scene, camera);
  assert.equal(reflection.tagged, 1, 'light sources tagged once the mirror turns on');
  assert.deepEqual(renders[0], ['renderer', scene, camera, 0.02], 'mirror plane at the road height');
  r.mesh.onBeforeRender('renderer', scene, camera);
  assert.equal(reflection.tagged, 1, 'no per-frame traversal');
  assets.update('coast', 'high', true, 'rain');
  r.mesh.onBeforeRender('renderer', scene, camera);
  assert.equal(reflection.tagged, 2, 'race start re-tags: the grid cars are new');
  assets.update('coast', 'high', true, 'day');
  assert.equal(reflection.strength, 0, 'dry road: no pass');
  assets.dispose();
  assert.equal(r.mesh.onBeforeRender, undefined, 'the hook leaves with the asphalt');
});

test('Medium keeps env-map-only wet asphalt: no mirror pass', async () => {
  const r = roadFakes();
  const reflection = { uniforms: { reflectMap: { value: null }, reflectMatrix: { value: new THREE.Matrix4() }, reflectStrength: { value: 0 } },
    strength: -1, setStrength(v) { this.strength = v; }, tag() {}, render() {}, dispose() {} };
  const assets = createCoastAssets({ scenery, cache: never, road: r.road, reflection });
  assets.update('coast', 'medium', false, 'rain');
  await tick();
  assets.update('coast', 'medium', false, 'rain');
  assert.equal(reflection.strength, 0);
  assets.dispose();
});

test('the sky dome controller gets the track, preset, tier and Ultra flag every frame, and is disposed with the assets', () => {
  const calls = [];
  const sky = { update: (...args) => { calls.push(args); }, dispose: () => calls.push('dispose') };
  const assets = createCoastAssets({ scenery, cache: never, sky });
  assert.equal(assets.update('coast', 'high', false, 'dusk', true), false, 'a sky swap is a texture swap: no shader warmup');
  assets.update('coast', 'medium', true, 'rain', false);
  assert.deepEqual(calls, [['coast', 'dusk', 'high', true], ['coast', 'rain', 'medium', false]]);
  assets.dispose();
  assert.equal(calls.at(-1), 'dispose');
});

test('the water controller runs after the sky every frame, lends its shore mask to the scenery layer, and is disposed with the assets', async () => {
  const calls = [], shore = { begin() {}, stamp() {}, end() {} };
  const sky = { update: () => { calls.push('sky'); }, dispose: () => calls.push('sky dispose') };
  const sea = { shore, update: (...args) => { calls.push(args); }, dispose: () => calls.push('sea dispose') };
  const handle = { kind: 'model', instance: () => new THREE.Group(), release() {} };
  const attached = [];
  const assets = createCoastAssets({ scenery: { attachModel: (...args) => attached.push(args), detachModel() {} }, cache: { load: async () => handle }, sky, sea });
  assert.equal(assets.update('coast', 'high', false, 'dusk', true), false, 'the water program exists from creation: no shader warmup');
  assert.deepEqual(calls, ['sky', ['coast', 'dusk', 'high']], 'the water reads the dome the sky just updated');
  await tick();
  assets.update('coast', 'high', false, 'dusk', true);
  assert.equal(attached[0][1], shore, 'the scenery layer stamps its sea-level footprints into the water mask');
  assets.dispose();
  assert.deepEqual(calls.slice(-2), ['sea dispose', 'sky dispose']);
});

test('world.js hands the procedural sky dome, sun disc, sea plane and sea lines to the Coast assets', async () => {
  const { readFileSync } = await import('node:fs');
  assert.match(readFileSync(new URL('../src/world.js', import.meta.url), 'utf8'), /createWorldCoastAssets\(renderer, \{ scenery: coastScenery, road, sky, sun, sea, seaLines \}, canvas\.dataset\)/);
});
