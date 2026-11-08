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
