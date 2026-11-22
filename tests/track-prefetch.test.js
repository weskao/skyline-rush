import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture, MeshStandardMaterial } from 'three';
import { createCoastAssets } from '../src/coast-assets.ts';

test('selected High Coast prefetches required models and asphalt once without attaching a scene prematurely', async () => {
  const requested = [], textures = [], attached = [];
  const mesh = { material: new MeshStandardMaterial({ name: 'procedural' }) };
  const assets = createCoastAssets({
    scenery: {
      attachModel: () => attached.push('model'), detachModel() {},
      attachBoats: () => attached.push('boats'), detachBoats() {},
    },
    boatClock: { value: 0 },
    cache: { load: async id => { requested.push(id); return { kind: 'fallback', id, fallback: 'procedural-scenery', reason: 'missing' }; } },
    road: { mesh, load: async file => { textures.push(file.url); return new Texture(); } },
    dataset: {},
  });
  assets.prefetch('coast', 'high');
  assert.deepEqual(requested, ['coast-scenery', 'coast-boats']);
  assert.equal(textures.length, 3);
  assert.deepEqual(attached, [], 'prefetch does not mutate the active showcase or race');
  assets.update('coast', 'high', false);
  assert.equal(requested.length, 2, 'renderer update shares in-flight prefetch');
  assert.equal(textures.length, 3, 'already requested KTX2 files are not fetched again');
  assets.dispose();
});

test('Low and procedural-only tracks never start detailed scene fetches', () => {
  const requests = [];
  const assets = createCoastAssets({
    scenery: { attachModel() {}, detachModel() {}, attachBoats() {}, detachBoats() {} },
    boatClock: { value: 0 },
    cache: { load: id => { requests.push(id); return new Promise(() => {}); } },
    road: { mesh: { material: new MeshStandardMaterial() },
      load: file => { requests.push(file.url); return new Promise(() => {}); } },
  });
  assets.prefetch('coast', 'low');
  assets.prefetch('canyon', 'high');
  assert.deepEqual(requests, []);
  assets.dispose();
});
