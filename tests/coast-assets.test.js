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

test('the procedural cones leave Coast once the scan coast is attached on Medium+, and come back everywhere else', async () => {
  const mountains = { material: { visible: true } };
  const handle = { kind: 'model', instance: () => new THREE.Group(), release() {} };
  const assets = createCoastAssets({ scenery, cache: { load: async () => handle }, mountains });
  assets.update('coast', 'high', false);
  assert.equal(mountains.material.visible, true, 'cones until the GLB is attached (and for good if it fails to load)');
  await tick();
  assets.update('coast', 'high', false);
  assert.equal(mountains.material.visible, false, 'the far headlands replace them');
  assets.update('coast', 'low', false);
  assert.equal(mountains.material.visible, true, 'Low draws no GLB: it keeps the cones');
  assets.update('coast', 'medium', false);
  assert.equal(mountains.material.visible, false);
  assets.update('neon', 'high', false);
  assert.equal(mountains.material.visible, true, 'other tracks keep their mountains');
  assets.update('coast', 'high', false);
  assets.dispose();
  assert.equal(mountains.material.visible, true);
});

test('D1, D2: the skyline buildings and bridge towers leave Coast with the cones on Medium+; Low, other tracks and a missing GLB keep them', async () => {
  const rig = () => {
    const city = { visible: true }, steel = new THREE.MeshStandardMaterial(), trim = new THREE.MeshBasicMaterial(), tower = new THREE.Group();
    tower.add(new THREE.Mesh(new THREE.BoxGeometry(), steel), new THREE.Mesh(new THREE.BoxGeometry(), trim));
    return { city, towers: [tower], shown: () => [city.visible, steel.visible, trim.visible] };
  };
  const handle = { kind: 'model', instance: () => new THREE.Group(), release() {} };
  const r = rig(), assets = createCoastAssets({ scenery, cache: { load: async () => handle }, city: r.city, towers: r.towers });
  assets.update('coast', 'high', false);
  assert.deepEqual(r.shown(), [true, true, true], 'until the scan coast is attached');
  await tick();
  assets.update('coast', 'high', false);
  assert.deepEqual(r.shown(), [false, false, false], 'the board has no city or towers: the sea arch is the landmark');
  assets.update('coast', 'low', false);
  assert.deepEqual(r.shown(), [true, true, true], 'owner decision 2026-11-14: Low keeps the develop look');
  assets.update('coast', 'medium', false);
  assert.deepEqual(r.shown(), [false, false, false]);
  r.city.visible = true; // world.js sets it on every track change
  assets.update('neon', 'high', false);
  assert.deepEqual(r.shown(), [true, true, true], 'Neon keeps its city, the other classics their towers');
  assets.update('coast', 'high', false);
  assets.dispose();
  assert.deepEqual(r.shown().slice(1), [true, true], 'the tower materials are handed back');
  const failed = rig(), fallback = createCoastAssets({ scenery, cache: { load: async () => ({ kind: 'fallback', fallback: 'procedural-scenery', reason: 'network' }) }, city: failed.city, towers: failed.towers });
  const warn = console.warn; console.warn = () => {};
  try { fallback.update('coast', 'high', false); await tick(); fallback.update('coast', 'high', false); } finally { console.warn = warn; }
  assert.deepEqual(failed.shown(), [true, true, true], 'a failed load is the procedural Coast, city and towers included');
  fallback.dispose();
});

test('the boats GLB loads beside the scenery only with a boat clock, and joins the scene outside a race like it', async () => {
  const log = [], settle = [], clock = { value: 0 }, dataset = {};
  const cache = { load: id => { log.push(['load', id]); return new Promise(done => settle.push(() => done({ kind: 'model', id, instance: () => id, release: () => log.push(['release', id]) }))); } };
  const scenery = { attachModel() {}, detachModel() {}, attachBoats: (source, time) => log.push(['boats', source, time]), detachBoats: () => log.push(['no boats']) };
  const assets = createCoastAssets({ scenery, cache, boatClock: clock, dataset });
  assets.update('coast', 'low', false);
  assert.deepEqual(log, [], 'Low loads nothing');
  assets.update('coast', 'high', true);
  assert.deepEqual(log, [['load', 'coast-scenery'], ['load', 'coast-boats']]);
  assert.equal(dataset.coastBoats, 'loading');
  settle.forEach(done => done()); await tick();
  assert.equal(assets.update('coast', 'high', true), false, 'never attach (and compile) after GO');
  assert.equal(dataset.coastBoats, 'waiting-for-race-end');
  assert.equal(assets.update('coast', 'high', false), true, 'attach outside racing → warm the boat program');
  assert.deepEqual(log.at(-1), ['boats', 'coast-boats', clock], 'the boats sail on the clock they were given');
  assert.equal(dataset.coastBoats, 'attached');
  assert.equal(assets.update('coast', 'high', false), false, 'only once');
  assets.dispose();
  assert.deepEqual(log.slice(-3), [['no boats'], ['release', 'coast-boats'], ['release', 'coast-scenery']], 'leave the scene before the cache frees the GLB');
  assert.equal(dataset.coastBoats, 'off');
});

test('world.js hands the procedural sky dome, sun disc, sea plane, sea lines, mountains, city and towers to the Coast assets', async () => {
  const { readFileSync } = await import('node:fs');
  assert.match(readFileSync(new URL('../src/world.js', import.meta.url), 'utf8'), /createWorldCoastAssets\(renderer, \{ scenery: coastScenery, road, sky, sun, sea, seaLines, mountains, city, towers \}, canvas\.dataset\)/);
});
