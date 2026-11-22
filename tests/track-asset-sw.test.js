import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/track-asset-sw.js', import.meta.url), 'utf8');
class FakeCache {
  entries = new Map();
  async keys() { return [...this.entries.keys()].map(url => new Request(url)); }
  async match(key) { return this.entries.get(typeof key === 'string' ? key : key.url)?.clone(); }
  async put(key, response) { this.entries.set(typeof key === 'string' ? key : key.url, response.clone()); }
}
const memory = new Map();
const caches = { async open(name) {
  if (!memory.has(name)) memory.set(name, new FakeCache());
  return memory.get(name);
} };
const callbacks = new Map();
const scope = 'https://game.example/skyline-rush/';
const self = {
  registration: { scope }, clients: { claim: async () => {} }, skipWaiting: async () => {},
  addEventListener(name, handler) { callbacks.set(name, handler); },
};
let networkFetches = 0;
runInNewContext(source, { self, caches, URL, fetch: async () => {
  networkFetches++;
  return new Response('online');
}, Promise, console });
const assetUrl = scope + 'models/coast-scenery.glb', key = assetUrl + '?__srpack=123';
const sendFetch = url => {
  let response;
  callbacks.get('fetch')({ request: new Request(url), respondWith(promise) { response = promise; } });
  return response;
};

test('a cold model or texture request never enters Service Worker routing', () => {
  assert.equal(sendFetch(assetUrl), undefined);
  assert.equal(networkFetches, 0);
});

test('notified verified assets are served from cache, without intercepting download requests', async () => {
  await (await caches.open('skyline-rush:track-assets:v1')).put(key, new Response('cached'));
  await (await caches.open('skyline-rush:track-asset-index:v1')).put(assetUrl, new Response(key));
  let acknowledged = false;
  callbacks.get('message')({ data: { type: 'track-pack-index-updated', urls: [assetUrl] },
    ports: [{ postMessage() { acknowledged = true; } }] });
  assert.equal(acknowledged, true);
  const hit = sendFetch(assetUrl);
  assert.ok(hit);
  assert.equal(await (await hit).text(), 'cached');
  assert.equal(networkFetches, 0);
  assert.equal(sendFetch(assetUrl + '?__srpack_download=123'), undefined);
});
