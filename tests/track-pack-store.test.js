import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createTrackPackStore, assetCacheKey, ASSET_CACHE } from '../src/track-pack-store.ts';

class MemoryCache {
  values = new Map();
  url(key) { return typeof key === 'string' ? key : key.url; }
  async match(key) { return this.values.get(this.url(key))?.clone(); }
  async put(key, response) { this.values.set(this.url(key), response.clone()); }
  async delete(key) { return this.values.delete(this.url(key)); }
  async keys() { return [...this.values.keys()].map(url => new Request(url)); }
}
class MemoryStorage {
  caches = new Map();
  async open(name) { if (!this.caches.has(name)) this.caches.set(name, new MemoryCache()); return this.caches.get(name); }
}
const sha = text => createHash('sha256').update(text).digest('hex');
const pack = (version = '1.0.0', payload = 'track-data') => ({
  trackId: 'coast', version, tier: 'high', preset: 'track', signature: `${version}:${sha(payload)}`,
  assets: [{ url: 'models/coast-scenery/coast-scenery.glb', sha256: sha(payload), bytes: payload.length }],
});
const create = (storage, requests, payload = 'track-data') => createTrackPackStore({ storage,
  baseUrl: 'https://game.example/skyline-rush/',
  fetchAsset: async request => {
    requests.push(String(request));
    return new Response(payload, { status: 200, headers: { 'content-type': 'model/gltf-binary' } });
  },
});

test('download once, verify real Cache Storage bytes and reuse after reload', async () => {
  const storage = new MemoryStorage(), requests = [], bundle = pack();
  const store = create(storage, requests);
  assert.equal(await store.status(bundle), 'missing');
  const progress = [];
  await store.download(bundle, item => progress.push(item));
  assert.equal(requests.length, 1);
  assert.equal(await store.status(bundle), 'ready');
  assert.deepEqual(progress.map(item => item.done), [1]);
  await create(storage, requests).download(bundle);
  assert.equal(requests.length, 1, 'already verified assets are reused');
  const cache = await storage.open(ASSET_CACHE);
  await cache.delete(assetCacheKey('https://game.example/skyline-rush/', bundle.assets[0], bundle.version));
  assert.equal(await store.status(bundle), 'missing', 'evicted files are not reported as downloaded');
});

test('changing only map version reuses checksummed assets without network', async () => {
  const storage = new MemoryStorage(), requests = [], store = create(storage, requests);
  await store.download(pack());
  assert.equal(await store.status(pack('1.0.1')), 'update');
  await store.download(pack('1.0.1'));
  assert.equal(requests.length, 1);
  assert.equal(await store.status(pack('1.0.1')), 'ready');
});

test('new bytes at an old URL never reuse a stale hash', async () => {
  const storage = new MemoryStorage(), requests = [];
  await create(storage, requests).download(pack());
  const changed = pack('1.0.1', 'new-data');
  assert.equal(await create(storage, requests).status(changed), 'update');
  await create(storage, requests, 'new-data').download(changed);
  assert.equal(requests.length, 2);
  assert.equal(await create(storage, requests).status(changed), 'ready');
  assert.equal(await create(storage, requests).status(pack()), 'update');
});

test('invalid content or interrupted network cannot mark pack ready', async () => {
  const storage = new MemoryStorage(), requests = [], bundle = pack();
  const broken = create(storage, requests, 'wrong-data');
  await assert.rejects(broken.download(bundle), /checksum/i);
  assert.equal(await broken.status(bundle), 'missing');
  await create(storage, requests).download(bundle);
  assert.equal(await broken.status(bundle), 'ready');
});

test('different maps share the same verified file without a second network transfer', async () => {
  const storage = new MemoryStorage(), requests = [], store = create(storage, requests);
  const one = pack(), two = { ...pack(), trackId: 'spiral', signature: 'spiral:one' };
  await store.download(one);
  await store.download(two);
  assert.equal(requests.length, 1);
  assert.equal(await store.status(one), 'ready');
  assert.equal(await store.status(two), 'ready');
});

test('map update frees unused old bytes without evicting assets shared by another map', async () => {
  const storage = new MemoryStorage(), requests = [], store = create(storage, requests);
  const original = pack(), shared = { ...pack(), trackId: 'spiral', signature: 'spiral:v1' };
  await store.download(original);
  await store.download(shared);
  await create(storage, requests, 'new-data').download(pack('1.0.1', 'new-data'));
  const cache = await storage.open(ASSET_CACHE);
  const oldKey = assetCacheKey('https://game.example/skyline-rush/', original.assets[0], original.version);
  assert.ok(await cache.match(oldKey), 'older bytes still belong to the second map');
  await store.download({ ...pack('1.0.2', 'new-data'), trackId: 'spiral', signature: 'spiral:v2' });
  assert.equal(await cache.match(oldKey), undefined, 'old hash is unreferenced and reclaimed');
});

test('a shared unchecksummed HDRI is reused across independently updated map versions', async () => {
  const storage = new MemoryStorage(), requests = [], store = create(storage, requests);
  const shared = { url: 'environments/sky/shared.hdr', sha256: '', bytes: 10, revision: 'shared-hdri-v1' };
  const coast = { ...pack(), assets: [shared], signature: 'coast-v1' };
  const neon = { ...pack('2.0.0'), trackId: 'neon', assets: [shared], signature: 'neon-v2' };
  await store.download(coast);
  await store.download(neon);
  assert.equal(requests.length, 1, 'independent map release does not re-download the shared HDRI');
  assert.equal(await store.status(coast), 'ready');
  assert.equal(await store.status(neon), 'ready');
  const replaced = { ...neon, signature: 'neon-v3', assets: [{ ...shared, revision: 'shared-hdri-v2' }] };
  assert.equal(await store.status(replaced), 'update', 'changing the shared resource revision invalidates the receipt');
});

test('first-time online play needs no mandatory download, but an installed old release does', async () => {
  const storage = new MemoryStorage(), requests = [], service = create(storage, requests);
  assert.equal(await service.updateRequired(pack('1.0.1')), false);
  await service.download(pack());
  assert.equal(await service.updateRequired(pack('1.0.1')), true);
  await service.download(pack('1.0.1'));
  assert.equal(await service.updateRequired(pack('1.0.1')), false);
});
test('quality-switch does not bypass a mandatory old map version', async () => {
  const storage = new MemoryStorage(), service = create(storage, []);
  await service.download({ ...pack(), tier: 'low', signature: 'low:v1' });
  assert.equal(await service.updateRequired({ ...pack('1.0.1'), tier: 'high' }), true);
  await service.download(pack('1.0.1'));
  assert.equal(await service.updateRequired(pack('1.0.1')), false);
});
test('same-release art signature change also requires an update', async () => {
  const storage = new MemoryStorage(), service = create(storage, []);
  await service.download(pack());
  assert.equal(await service.updateRequired({ ...pack(), signature: 'art-changed' }), true);
});
test('failed update cannot clear a previous mandatory update', async () => {
  const storage = new MemoryStorage(), requests = [];
  await create(storage, requests).download(pack());
  await assert.rejects(create(storage, requests, 'wrong-data').download(pack('1.0.1', 'new-data')), /checksum/i);
  assert.equal(await create(storage, requests).updateRequired(pack('1.0.1', 'new-data')), true);
});
