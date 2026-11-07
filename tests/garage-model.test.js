// Phase 2 `?model=probe` Garage adapter: docs/designs/3d-pipeline/phase2-model-contracts.md §2 lifecycle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGarageModel, garageModelId } from '../src/garage-model.ts';

const tick = () => new Promise(r => setTimeout(r, 0));

/** A procedural-car stand-in: two meshes plus a VFX group that must stay visible. */
function host(name = 'home') {
  const car = new THREE.Group(), keep = new THREE.Group(), scene = new THREE.Scene();
  const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  const wheel = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  keep.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  car.add(body, wheel, keep);
  scene.add(car);
  return { name, car, keep, scene, body, wheel };
}

/** Fake ModelCache recording loads/releases; each handle clones one shared probe tree. */
function fakeCache({ fail } = {}) {
  const log = [];
  const original = new THREE.Group();
  original.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()), { name: 'wheel_fl' }));
  let n = 0;
  return {
    log,
    async load(id, { quality, signal } = {}) {
      const k = ++n;
      log.push(`load:${id}:${quality}`);
      await tick();
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      if (fail) return { kind: 'fallback', id, fallback: 'procedural-car', reason: fail };
      return { kind: 'model', id, instance: () => original.clone(true), release: () => log.push(`release:${k}`) };
    },
  };
}

function setup(cacheOptions) {
  const cache = fakeCache(cacheOptions), dataset = {};
  const compiled = [];
  const model = createGarageModel({ id: 'pipeline-probe', cache, dataset, compile: async object => { compiled.push(object); } });
  return { cache, dataset, compiled, model };
}
const settle = async () => { for (let i = 0; i < 5; i++) await tick(); };
const drawn = object => object.layers.test(new THREE.Camera().layers);

test('garageModelId: only ?model=probe opts in', () => {
  assert.equal(garageModelId('?model=probe'), 'pipeline-probe');
  assert.equal(garageModelId('?perf&model=probe'), 'pipeline-probe');
  for (const search of ['', '?model=', '?model=Probe', '?model=pipeline-probe', '?model=../x']) assert.equal(garageModelId(search), null, search);
});

test('open: the probe replaces the procedural car (compiled first), VFX group stays drawn', async () => {
  const { model, dataset, compiled } = setup();
  const home = host();
  model.sync(true, 'high', home);
  assert.equal(dataset.garageModel, 'loading');
  await settle();
  assert.equal(dataset.garageModel, 'model');
  const probe = home.car.getObjectByName('wheel_fl');
  assert.ok(probe, 'probe instance attached to the car');
  assert.ok(compiled.some(o => o.getObjectByName('wheel_fl') === probe), 'compiled before it is shown');
  assert.equal(drawn(home.body), false);
  assert.equal(drawn(home.wheel), false);
  assert.equal(drawn(home.keep.children[0]), true, 'aero VFX keeps rendering');
  assert.equal(drawn(probe), true);
});

test('camera switch: Home ↔ Studio and repeated syncs reuse each instance with one load', async () => {
  const { model, cache, dataset } = setup();
  const home = host(), studio = host('studio');
  model.sync(true, 'high', home);
  await settle();
  const homeId = JSON.parse(dataset.garageModelInstances).home;
  model.sync(true, 'high', studio);
  await settle();
  model.sync(true, 'high', home);
  model.sync(true, 'high', null);
  model.sync(true, 'high', home);
  await settle();
  const ids = JSON.parse(dataset.garageModelInstances);
  assert.equal(ids.home, homeId, 'same Home instance');
  assert.ok(ids.studio && ids.studio !== homeId, 'Studio has its own clone');
  assert.deepEqual(cache.log, ['load:pipeline-probe:high']);
});

test('quality change: loads the other quality, swaps, then releases the old handle', async () => {
  const { model, cache, dataset } = setup();
  const home = host();
  model.sync(true, 'high', home);
  await settle();
  const before = JSON.parse(dataset.garageModelInstances).home;
  model.sync(true, 'low', home);
  assert.deepEqual(cache.log, ['load:pipeline-probe:high', 'load:pipeline-probe:low'], 'old handle kept until the new one resolves');
  await settle();
  assert.deepEqual(cache.log, ['load:pipeline-probe:high', 'load:pipeline-probe:low', 'release:1']);
  assert.notEqual(JSON.parse(dataset.garageModelInstances).home, before);
  assert.equal(home.car.children.filter(c => c.getObjectByName('wheel_fl')).length, 1, 'old instance removed');
});

test('close: detaches every instance, restores the procedural car and releases once', async () => {
  const { model, cache, dataset } = setup();
  const home = host(), studio = host('studio');
  model.sync(true, 'high', home);
  await settle();
  model.sync(true, 'high', studio);
  await settle();
  model.sync(false, 'high', null);
  model.sync(false, 'high', null);
  assert.equal(dataset.garageModel, 'off');
  for (const h of [home, studio]) {
    assert.equal(h.car.getObjectByName('wheel_fl'), undefined);
    assert.equal(drawn(h.body), true);
    assert.equal(drawn(h.wheel), true);
  }
  assert.deepEqual(cache.log, ['load:pipeline-probe:high', 'release:1']);
});

test('close while loading cancels the load; reopening loads again', async () => {
  const { model, cache, dataset } = setup();
  const home = host();
  model.sync(true, 'high', home);
  model.sync(false, 'high', null);
  await settle();
  assert.equal(dataset.garageModel, 'off');
  assert.equal(home.car.getObjectByName('wheel_fl'), undefined);
  model.sync(true, 'high', home);
  await settle();
  assert.equal(dataset.garageModel, 'model');
  assert.equal(cache.log.filter(l => l.startsWith('load')).length, 2);
});

test('fallback keeps the procedural car and reports the reason', async () => {
  const { model, dataset } = setup({ fail: 'missing' });
  const home = host();
  model.sync(true, 'high', home);
  await settle();
  assert.equal(dataset.garageModel, 'fallback:missing');
  assert.equal(drawn(home.body), true);
  assert.equal(home.car.getObjectByName('wheel_fl'), undefined);
});

test('context restore: warmup recompiles every attached instance without loading', async () => {
  const { model, cache, dataset, compiled } = setup();
  const home = host(), studio = host('studio');
  model.sync(true, 'high', home);
  await settle();
  model.sync(true, 'high', studio);
  await settle();
  const warmups = Number(dataset.garageModelWarmups);
  compiled.length = 0;
  model.warmAgain();
  await settle();
  assert.equal(compiled.length, 2);
  assert.equal(Number(dataset.garageModelWarmups), warmups + 2);
  assert.deepEqual(cache.log, ['load:pipeline-probe:high']);
});
