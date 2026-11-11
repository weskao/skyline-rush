import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('collectibles guide mounts authored sequential-image preview for all four tiers', () => {
  const guide = read('src/CollectiblesGuide.vue');
  const preview = read('src/PickupAnimatedPreview.vue');
  assert.match(guide, /PickupAnimatedPreview/);
  assert.match(guide, /<PickupAnimatedPreview[^>]+:tier="pickup.key"/);
  assert.match(preview, /road-pickups\/animated\/\$\{props\.tier\}\.webp/);
  assert.match(preview, /road-pickups\/animated\/\$\{props\.tier\}-poster\.webp/);
  assert.match(preview, /prefers-reduced-motion/);
  assert.match(preview, /\@error="failSprite"/);
  assert.match(preview, /Pickup3DPreview/, 'missing sprites fall back to the existing 3D model, not a broken image');
  assert.match(preview, /\.svg/, 'legacy SVG remains usable when WebGL is off');
});

test('animated artwork replaces the guide only, never the in-race 3D models or collection burst', () => {
  const scene = read('src/effects.js');
  const guide = read('src/CollectiblesGuide.vue');
  assert.match(scene, /createPickupGeometries/);
  assert.match(scene, /createPickupCollectVfx/);
  assert.doesNotMatch(scene, /PickupAnimatedPreview|\.webp/);
  assert.match(guide, /PickupAnimatedPreview/);
});

test('asset conversion instructions preserve exact four animation identities, frame duration and fallbacks', () => {
  const doc = read('docs/designs/road-pickups/README.md');
  for (const tier of ['cell', 'can', 'tank', 'overcharge']) {
    assert.match(doc, new RegExp('animated/' + tier + '\\.webp'));
    assert.match(doc, new RegExp('animated/' + tier + '-poster\\.webp'));
  }
  assert.match(doc, /16 frames/);
  assert.match(doc, /85 ms/);
});
