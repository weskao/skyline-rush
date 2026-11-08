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
  assert.equal(dataset.coastRoad, '1024');
  assert.equal(assets.update('coast', 'medium', false), false);
  assets.update('neon', 'medium', false);
  assert.equal(r.mesh.material, r.defaultMaterial, 'other tracks get the procedural road back');
  assets.update('coast', 'low', false);
  assert.equal(r.mesh.material, r.defaultMaterial, 'Low keeps the current road');
  assets.dispose();
});

test('Ultra loads the 2K set; the tier not on screen is freed', async () => {
  const r = roadFakes(), assets = createCoastAssets({ scenery, cache: never, road: r.road });
  assets.update('coast', 'high', false);
  await tick();
  assets.update('coast', 'high', false);
  const oneK = r.mesh.material;
  let freed = false;
  oneK.addEventListener('dispose', () => { freed = true; });
  assets.update('coast', 'high', false, 'track', true);
  await tick();
  assets.update('coast', 'high', false, 'track', true);
  assert.ok(r.log.includes('2048:baseColor'));
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
  const shader = { uniforms: {}, vertexShader: '', fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  r.mesh.material.onBeforeCompile(shader, null);
  assert.equal(assets.update('coast', 'high', true, 'rain'), false);
  assert.ok(shader.uniforms.wetness.value >= .7);
  assets.update('coast', 'high', true, 'day');
  assert.equal(shader.uniforms.wetness.value, 0);
  assets.dispose();
});
