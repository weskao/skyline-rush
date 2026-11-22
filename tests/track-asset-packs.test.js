import test from 'node:test';
import assert from 'node:assert/strict';
import { trackAssetPack, TRACK_PACK_VERSIONS } from '../src/track-asset-packs.ts';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';

test('every released classic map owns an independently updatable asset version', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    const pack = trackAssetPack(id, 'low');
    assert.ok(pack, id);
    assert.match(pack.version, /^\d+\.\d+\.\d+$/);
    assert.equal(pack.version, TRACK_PACK_VERSIONS[id]);
    assert.ok(pack.assets.some(asset => asset.url === `track-teasers/${id}.jpg`), id);
  }
  assert.equal(trackAssetPack('__proto__', 'high'), null);
});

test('Low never downloads detailed scene resources; Medium and High use their respective texture tiers', () => {
  const low = trackAssetPack('coast', 'low');
  assert.equal(low.assets.length, 1);
  const medium = trackAssetPack('coast', 'medium');
  const high = trackAssetPack('coast', 'high');
  assert.ok(medium.assets.some(asset => asset.url.endsWith('asphalt_basecolor_1k.ktx2')));
  assert.ok(high.assets.some(asset => asset.url.endsWith('asphalt_basecolor_2k.ktx2')));
  assert.ok(!medium.assets.some(asset => asset.url.endsWith('asphalt_basecolor_2k.ktx2')));
  assert.ok(high.assets.some(asset => asset.url.includes('coast-scenery') && asset.url.endsWith('.glb')));
  assert.ok(high.assets.some(asset => asset.url.endsWith('.hdr')));
  assert.notEqual(high.signature, medium.signature);
});

test('Ultra includes both sky texture widths for device capability fallback', () => {
  const high = trackAssetPack('neon', 'high');
  const ultra = trackAssetPack('neon', 'high', true);
  assert.ok(high.assets.some(asset => asset.url.includes('_sky_4k.ktx2')));
  assert.ok(!high.assets.some(asset => asset.url.includes('_sky_8k.ktx2')));
  assert.ok(ultra.assets.some(asset => asset.url.includes('_sky_4k.ktx2')));
  assert.ok(ultra.assets.some(asset => asset.url.includes('_sky_8k.ktx2')));
  assert.equal(new Set(ultra.assets.map(asset => asset.url)).size, ultra.assets.length);
});

test('all installed asset entries have a stable URL, size and optional verified checksum', () => {
  for (const id of Object.keys(RACE_TRACKS)) {
    for (const quality of ['low', 'medium', 'high']) {
      const pack = trackAssetPack(id, quality);
      for (const asset of pack.assets) {
        assert.match(asset.url, /^(track-teasers|models|materials|environments)\//);
        assert.ok(Number.isInteger(asset.bytes) && asset.bytes >= 0);
        if (asset.sha256) assert.match(asset.sha256, /^[0-9a-f]{64}$/);
      }
    }
  }
});

test('every Coming Soon concept card owns an independent preview asset version but no false 3D download', () => {
  for (const [id, card] of Object.entries(UPCOMING_TRACKS)) {
    const pack = trackAssetPack(id, 'high');
    assert.ok(pack, id);
    assert.equal(pack.version, TRACK_PACK_VERSIONS[id]);
    assert.deepEqual(pack.assets.map(asset => asset.url), [card.image, card.route]);
    assert.ok(pack.assets.every(asset => asset.url.startsWith('track-teasers/')));
  }
});
