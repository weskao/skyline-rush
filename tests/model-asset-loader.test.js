// Phase 2 async loader contract: docs/designs/3d-pipeline/phase2-model-contracts.md §2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModelCache } from '../src/asset-model-loader.ts';
import { makeGlb, validEntry } from './model-fixtures.js';

const BASE = '/skyline-rush/';
const URL_MAIN = '/skyline-rush/models/probe-test/probe-test.glb';

/** Recording fetch double. `respond(url, init)` returns a Response or a promise of one. */
function fakeFetch(respond = () => new Response(makeGlb())) {
  /** @type {{ url: string, signal: AbortSignal }[]} */
  const calls = [];
  const fetch = async (/** @type {string} */ url, /** @type {{ signal: AbortSignal }} */ init) => {
    calls.push({ url, signal: init.signal });
    return respond(url, init);
  };
  return { fetch, calls };
}

/** A fetch whose response is released by hand; rejects with the signal's reason on abort. */
function deferredFetch() {
  /** @type {(r: Response) => void} */
  let release = () => {};
  const double = fakeFetch((_url, init) => new Promise((resolve, reject) => {
    release = resolve;
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
  }));
  return { ...double, release: (/** @type {Response} */ r = new Response(makeGlb())) => release(r) };
}

function cacheWith(fetch, entry = validEntry(), extra = {}) {
  return createModelCache({ baseUrl: BASE, manifest: { [entry.id]: entry }, fetch, timeoutMs: 50, ...extra });
}

const tick = () => new Promise(r => setTimeout(r, 0));

/** Unique geometries/materials reachable from an instance, each with a dispose counter. */
function trackDisposals(object) {
  const counts = new Map();
  object.traverse(o => {
    for (const res of [o.geometry, ...[o.material].flat()]) {
      if (res && !counts.has(res)) {
        counts.set(res, 0);
        res.addEventListener('dispose', () => counts.set(res, counts.get(res) + 1));
      }
    }
  });
  return counts;
}

test('loads a valid GLB from the BASE_URL subpath', async () => {
  const { fetch, calls } = fakeFetch();
  const result = await cacheWith(fetch).load('probe-test');
  assert.equal(result.kind, 'model');
  assert.deepEqual(calls.map(c => c.url), [URL_MAIN]);
  assert.ok(result.instance().getObjectByName('wheel_fl'));
});

test('missing GLB (HTTP 404) resolves to the procedural fallback', async () => {
  const { fetch } = fakeFetch(() => new Response('', { status: 404 }));
  assert.deepEqual(await cacheWith(fetch).load('probe-test'),
    { kind: 'fallback', id: 'probe-test', fallback: 'procedural-car', reason: 'missing' });
});

test('network error resolves to fallback "network"', async () => {
  const { fetch } = fakeFetch(() => { throw new TypeError('offline'); });
  const result = await cacheWith(fetch).load('probe-test');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.reason, 'network');
});

test('slow GLB times out, aborts the fetch and ignores the late response', async () => {
  const slow = deferredFetch();
  const cache = cacheWith(slow.fetch);
  const result = await cache.load('probe-test');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.reason, 'timeout');
  assert.equal(slow.calls[0].signal.aborted, true, 'timed-out fetch is aborted');
  slow.release(); // late response must not resurrect the entry
  await tick();
  const retry = cache.load('probe-test');
  await tick();
  assert.equal(slow.calls.length, 2, 'timed-out entry was not cached');
  slow.release();
  assert.equal((await retry).kind, 'model');
});

test('failures are not cached: the next load fetches again', async () => {
  let status = 404;
  const { fetch, calls } = fakeFetch(() => (status === 404 ? new Response('', { status }) : new Response(makeGlb())));
  const cache = cacheWith(fetch);
  assert.equal((await cache.load('probe-test')).kind, 'fallback');
  status = 200;
  assert.equal((await cache.load('probe-test')).kind, 'model');
  assert.equal(calls.length, 2);
});

test('invalid GLB (bad magic / garbage) resolves to fallback "invalid"', async () => {
  for (const body of [new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), new TextEncoder().encode('{"not":"glb"}')]) {
    const { fetch } = fakeFetch(() => new Response(body));
    const result = await cacheWith(fetch).load('probe-test');
    assert.equal(result.kind, 'fallback');
    assert.equal(result.reason, 'invalid');
  }
});

test('decoder unavailable resolves to fallback "decoder-unavailable"', async () => {
  const entry = { ...validEntry(), decoders: ['meshopt'] };
  const { fetch } = fakeFetch();
  const result = await cacheWith(fetch, entry, { loadMeshopt: () => Promise.reject(new Error('no WebAssembly')) }).load('probe-test');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.reason, 'decoder-unavailable');
});

test('GLB requiring meshopt while the entry does not enable it is "invalid"', async () => {
  const { fetch } = fakeFetch(() => new Response(makeGlb({ extensionsRequired: ['EXT_meshopt_compression'] })));
  const result = await cacheWith(fetch).load('probe-test');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.reason, 'invalid');
});

test('meshopt decoder is loaded at most once per cache', async () => {
  const a = { ...validEntry('probe-a'), decoders: ['meshopt'] };
  const b = { ...validEntry('probe-b'), decoders: ['meshopt'] };
  let loads = 0;
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const cache = createModelCache({
    baseUrl: BASE, manifest: { [a.id]: a, [b.id]: b }, fetch: fakeFetch().fetch,
    loadMeshopt: async () => { loads++; await MeshoptDecoder.ready; return MeshoptDecoder; },
  });
  await Promise.all([cache.load('probe-a'), cache.load('probe-b')]);
  assert.equal(loads, 1);
});

test('required node names match exactly (case-sensitive)', async () => {
  const { fetch } = fakeFetch(() => new Response(makeGlb({ nodes: ['probe_body', 'Wheel_FL'] })));
  const result = await cacheWith(fetch).load('probe-test');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.reason, 'missing-node:wheel_fl');
});

test('required material missing resolves to "missing-material:<name>"', async () => {
  const { fetch } = fakeFetch(() => new Response(makeGlb({ materials: ['other_paint'] })));
  const result = await cacheWith(fetch).load('probe-test');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.reason, 'missing-material:probe_paint');
});

test('unknown id is a programmer error (TypeError)', async () => {
  await assert.rejects(cacheWith(fakeFetch().fetch).load('nope'), TypeError);
});

test('duplicate concurrent and later requests share one fetch', async () => {
  const slow = deferredFetch();
  const cache = cacheWith(slow.fetch, validEntry(), { timeoutMs: 1000 });
  const both = Promise.all([cache.load('probe-test'), cache.load('probe-test')]);
  await tick();
  slow.release();
  const [a, b] = await both;
  assert.equal(a.kind, 'model');
  assert.equal(b.kind, 'model');
  assert.equal((await cache.load('probe-test')).kind, 'model');
  assert.equal(slow.calls.length, 1);
});

test('quality "low" fetches the low LOD url; missing LOD falls back to the main url', async () => {
  const entry = { ...validEntry(), lods: [{ quality: 'low', url: 'models/probe-test/probe-test-low.glb' }] };
  const { fetch, calls } = fakeFetch();
  const cache = cacheWith(fetch, entry);
  await cache.load('probe-test', { quality: 'low' });
  await cache.load('probe-test', { quality: 'high' });
  assert.deepEqual(calls.map(c => c.url), ['/skyline-rush/models/probe-test/probe-test-low.glb', URL_MAIN]);
});

test('cancellation: an already-aborted signal rejects without fetching', async () => {
  const { fetch, calls } = fakeFetch();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(cacheWith(fetch).load('probe-test', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls.length, 0);
});

test('cancellation: aborting one of two callers keeps the shared fetch alive', async () => {
  const slow = deferredFetch();
  const cache = cacheWith(slow.fetch, validEntry(), { timeoutMs: 1000 });
  const controller = new AbortController();
  const first = cache.load('probe-test', { signal: controller.signal });
  const second = cache.load('probe-test');
  await tick();
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(slow.calls[0].signal.aborted, false);
  slow.release();
  assert.equal((await second).kind, 'model');
});

test('cancellation: aborting every caller aborts the fetch and allows a retry', async () => {
  const slow = deferredFetch();
  const cache = cacheWith(slow.fetch, validEntry(), { timeoutMs: 1000 });
  const c1 = new AbortController(), c2 = new AbortController();
  const p1 = cache.load('probe-test', { signal: c1.signal });
  const p2 = cache.load('probe-test', { signal: c2.signal });
  await tick();
  c1.abort(); c2.abort();
  await assert.rejects(p1, { name: 'AbortError' });
  await assert.rejects(p2, { name: 'AbortError' });
  assert.equal(slow.calls[0].signal.aborted, true);
  const retry = cache.load('probe-test');
  await tick();
  assert.equal(slow.calls.length, 2, 'entry was removed, retry fetches again');
  slow.release();
  assert.equal((await retry).kind, 'model');
});

test('ownership: instances share resources but have independent transforms', async () => {
  const handle = await cacheWith(fakeFetch().fetch).load('probe-test');
  assert.equal(handle.kind, 'model');
  const a = handle.instance(), b = handle.instance();
  assert.notEqual(a, b);
  const wa = a.getObjectByName('wheel_fl'), wb = b.getObjectByName('wheel_fl');
  assert.equal(wa.geometry, wb.geometry, 'geometry shared');
  assert.equal(wa.material, wb.material, 'material shared');
  wa.position.set(5, 0, 0);
  assert.equal(wb.position.x, 0);
  assert.equal(handle.instance().getObjectByName('wheel_fl').position.x, 0, 'cached original untouched');
});

test('disposal: resources dispose exactly once when the last handle releases; double release is safe', async () => {
  const { fetch, calls } = fakeFetch();
  const cache = cacheWith(fetch);
  const h1 = await cache.load('probe-test'), h2 = await cache.load('probe-test');
  assert.equal(h1.kind, 'model');
  assert.equal(h2.kind, 'model');
  const counts = trackDisposals(h1.instance());
  assert.ok(counts.size >= 2, 'tracked geometry + material');
  h1.release();
  h1.release(); // second release of the same handle is a no-op
  assert.ok([...counts.values()].every(n => n === 0), 'still referenced by h2');
  h2.release();
  assert.ok([...counts.values()].every(n => n === 1), `each resource disposed once: ${[...counts.values()]}`);
  h2.release();
  assert.ok([...counts.values()].every(n => n === 1));
  await cache.load('probe-test');
  assert.equal(calls.length, 2, 'released entry is removed; next load re-fetches');
});

test('single GLTFLoader backend; no renderer, no KTX2Loader construction and no Draco in the loader module', () => {
  const src = readFileSync(new URL('../src/asset-model-loader.ts', import.meta.url), 'utf8');
  assert.equal(src.match(/new GLTFLoader\(/g)?.length, 1);
  assert.doesNotMatch(src, /WebGLRenderer|new KTX2Loader|DRACOLoader/);
});

test('ktx2: without a loadKtx2 provider the entry falls back as "decoder-unavailable"', async () => {
  const entry = { ...validEntry(), decoders: ['ktx2'] };
  const result = await cacheWith(fakeFetch().fetch, entry).load('probe-test');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.reason, 'decoder-unavailable');
});

test('ktx2: a rejecting provider falls back as "decoder-unavailable"', async () => {
  const entry = { ...validEntry(), decoders: ['ktx2'] };
  const result = await cacheWith(fakeFetch().fetch, entry, { loadKtx2: () => Promise.reject(new Error('no transcoder')) }).load('probe-test');
  assert.equal(result.reason, 'decoder-unavailable');
});

test('ktx2: the provider runs at most once per cache and the model loads', async () => {
  const a = { ...validEntry('probe-a'), decoders: ['ktx2'] };
  const b = { ...validEntry('probe-b'), decoders: ['ktx2'] };
  let loads = 0;
  const cache = createModelCache({
    baseUrl: BASE, manifest: { [a.id]: a, [b.id]: b }, fetch: fakeFetch().fetch,
    loadKtx2: async () => { loads++; return { fake: 'KTX2Loader' }; },
  });
  const results = await Promise.all([cache.load('probe-a'), cache.load('probe-b')]);
  assert.deepEqual(results.map(r => r.kind), ['model', 'model']);
  assert.equal(loads, 1);
});

test('GLB requiring KHR_texture_basisu while the entry does not enable ktx2 is "invalid"', async () => {
  const { fetch } = fakeFetch(() => new Response(makeGlb({ extensionsRequired: ['KHR_texture_basisu'] })));
  const result = await cacheWith(fetch, validEntry(), { loadKtx2: async () => ({}) }).load('probe-test');
  assert.equal(result.kind, 'fallback');
  assert.equal(result.reason, 'invalid');
});
