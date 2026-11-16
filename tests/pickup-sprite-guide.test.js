import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('collectibles guide mounts the live 3D preview for all four tiers; the sprites are its fallback only', () => {
  const guide = read('src/CollectiblesGuide.vue');
  const preview = read('src/Pickup3DPreview.vue');
  assert.match(guide, /<Pickup3DPreview[^>]+:tier="pickup.key"/);
  assert.match(preview, /<canvas[^>]+class="pickup-3d-canvas"/, 'the live model is always mounted');
  assert.match(preview, /<img v-if="!ready"[^>]+class="pickup-animation"/,
    'the image is shown only until the first live frame, or for good without WebGL');
  assert.match(preview, /animated\/\$\{props\.tier\}\$\{reduced\.value \? '-poster' : ''\}\.webp/,
    'animated sprite, or its still poster under reduced motion');
  assert.match(preview, /@error="spriteFailed = true"/);
  assert.match(preview, /\$\{props\.tier\}\.svg/, 'a missing sprite falls back to the authored SVG, not a broken image');
  assert.match(preview, /catch \{/, 'a browser without WebGL keeps the image instead of throwing');
});

test('sprite artwork never reaches the in-race renderer or the collection effects', () => {
  const guide = read('src/CollectiblesGuide.vue');
  for (const path of ['src/effects.js', 'src/pickup-markers.js', 'src/pickup-collect-vfx.js', 'src/pickup-preview-stage.ts'])
    assert.doesNotMatch(read(path), /\.webp/, path);
  assert.match(read('src/effects.js'), /createPickupCollectVfx/);
  assert.doesNotMatch(guide, /\.webp/, 'the guide itself does not pick artwork; its preview component does');
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
