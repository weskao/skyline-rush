import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const guide = read('src/CollectiblesGuide.vue'), style = read('src/pickup-guide-art.css');
const tiers = ['cell', 'can', 'tank', 'overcharge'];

test('every pickup is a genuine separate illustration on the guide, not a shared diamond', () => {
  const preview = read('src/PickupAnimatedPreview.vue');
  assert.match(guide, /PickupAnimatedPreview/);
  assert.match(preview, /import\.meta\.env\.BASE_URL/, 'works on GitHub Pages subpath');
  assert.match(preview, /animated\/\$\{props\.tier\}/, 'each tier uses its own AI animation');
  assert.match(preview, /\.svg/, 'preserve authored SVG fallback when images are unavailable');
  assert.doesNotMatch(guide, /class="gem-body"/);
  assert.match(guide, /class="collectible-card pickup-card"/);
  for (const tier of tiers) {
    const svg = read(`public/feature-assets/road-pickups/${tier}.svg`);
    assert.match(svg, /viewBox="0 0 384 384"/, tier + ' retains high-resolution vector art');
    assert.match(svg, /<g transform=/, tier + ' has authored product details');
    assert.match(svg, /<path/, tier + ' is not a flat placeholder');
    assert.doesNotMatch(svg, /<image\b|<foreignObject\b/, tier + ' is self-contained');
  }
  assert.equal(new Set(tiers.map(tier => read(`public/feature-assets/road-pickups/${tier}.svg`))).size, 4);
});

test('guide cards animate their product art and respect reduced motion', () => {
  assert.match(style, /@keyframes pickup-hover/);
  assert.match(style, /@keyframes pickup-orbit/);
  assert.match(style, /prefers-reduced-motion: reduce/);
  assert.match(style, /object-fit: contain/);
  assert.match(style, /max-width: 480px/);
});
