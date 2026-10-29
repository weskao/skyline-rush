import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReleaseMediaCache, RELEASE_MEDIA_CACHE } from '../src/release-media-cache.ts';

const CLIP = 'https://example.test/whats-new/0.24.0/clip.desktop.en.mp4';
const OLD = 'https://example.test/whats-new/0.10.0/clip.desktop.en.mp4';

// A Cache Storage stand-in shared across "visits", the same way the browser keeps it between page loads.
function fakeCaches() {
  const stores = new Map();
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        match: async url => entries.get(url)?.clone(),
        put: async (url, response) => { entries.set(url, response); },
        keys: async () => [...entries.keys()].map(url => ({ url })),
        delete: async request => entries.delete(request.url),
      };
    },
  };
}
function deps(caches, status = 200) {
  const calls = [];
  let urls = 0;
  return {
    calls,
    caches,
    fetch: async url => { calls.push(url); return new Response(status === 200 ? 'clip-bytes' : '', { status }); },
    createObjectURL: () => `blob:clip-${++urls}`,
  };
}

test('a clip is downloaded once and reused for every later reopen in the same visit', async () => {
  const d = deps(fakeCaches());
  const cache = createReleaseMediaCache(new Set([CLIP]), d);
  assert.equal(cache.peek(CLIP), null);
  const [first, concurrent] = await Promise.all([cache.load(CLIP), cache.load(CLIP)]);
  assert.equal(first, 'blob:clip-1');
  assert.equal(concurrent, first);
  assert.equal(await cache.load(CLIP), first);
  assert.equal(cache.peek(CLIP), first);
  assert.deepEqual(d.calls, [CLIP]);
});

test('a later visit plays the clip from Cache Storage without touching the network', async () => {
  const caches = fakeCaches();
  await createReleaseMediaCache(new Set([CLIP]), deps(caches)).load(CLIP);
  const next = deps(caches);
  assert.match(await createReleaseMediaCache(new Set([CLIP]), next).load(CLIP), /^blob:/);
  assert.deepEqual(next.calls, []);
});

test('clips of releases no longer shown are dropped so the cache stays bounded', async () => {
  const caches = fakeCaches();
  await createReleaseMediaCache(new Set([OLD]), deps(caches)).load(OLD);
  await createReleaseMediaCache(new Set([CLIP]), deps(caches)).load(CLIP);
  assert.deepEqual([...caches.stores.get(RELEASE_MEDIA_CACHE).keys()], [CLIP]);
});

test('without Cache Storage (plain-http LAN dev server) the clip is still fetched only once per visit', async () => {
  const d = deps(undefined);
  const cache = createReleaseMediaCache(new Set([CLIP]), d);
  assert.equal(await cache.load(CLIP), 'blob:clip-1');
  assert.equal(await cache.load(CLIP), 'blob:clip-1');
  assert.deepEqual(d.calls, [CLIP]);
});

test('a failed download falls back to the network address, is never stored and is retried next time', async () => {
  const caches = fakeCaches();
  const d = deps(caches, 404);
  const cache = createReleaseMediaCache(new Set([CLIP]), d);
  assert.equal(await cache.load(CLIP), CLIP);
  assert.equal(cache.peek(CLIP), null);
  assert.equal(await cache.load(CLIP), CLIP);
  assert.equal(d.calls.length, 2);
  assert.equal(caches.stores.get(RELEASE_MEDIA_CACHE).size, 0);
});

test('a broken Cache Storage never blocks the clip', async () => {
  const d = deps({ open: async () => { throw new Error('quota'); } });
  assert.equal(await createReleaseMediaCache(new Set([CLIP]), d).load(CLIP), 'blob:clip-1');
});
