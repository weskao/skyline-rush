import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const pathFor = filename => new URL('../public/feature-assets/wave3-demo/raster/' + filename, import.meta.url);
const asset = filename => readFileSync(pathFor(filename));
const source = filename => readFileSync(new URL('../src/' + filename, import.meta.url), 'utf8');

for (const [id, width, height] of [
  ['demo-collection-empty', 288, 288],
  ['demo-results-banner', 432, 156],
]) {
  test(id + ' retains genuine 3x transparent WebP without deleted PNG fallback', () => {
    const webp = asset(id + '@3x.webp');
    assert.equal(webp.toString('ascii', 0, 4), 'RIFF');
    assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
    assert.equal(webp.toString('ascii', 12, 16), 'VP8X');
    assert.equal(webp.readUInt32LE(4) + 8, webp.length);
    assert.deepEqual([webp.readUIntLE(24, 3) + 1, webp.readUIntLE(27, 3) + 1], [width, height]);
    assert.ok(webp[20] & 0x10, id + ' WebP must preserve alpha');
    assert.equal(existsSync(pathFor(id + '@3x.png')), false, id + ' PNG backup must remain deleted');
  });
}
test('A-05 empty-state, A-06 earned result and artwork motion integrate without entitlement changes', () => {
  const collection = source('Wave3DemoCollection.vue');
  const results = source('wave3-demo-results-ui.ts');
  const integration = source('wave3-demo-results-integration.ts');
  const css = source('wave3-demo-results.css');
  assert.match(collection, /demo-collection-empty/);
  assert.match(collection, /collection-empty-scan/);
  assert.match(collection, /@keyframes wave3-collection-scan/);
  assert.doesNotMatch(collection, /emptyArtFallback/);
  assert.match(integration, /demo-results-banner/);
  assert.doesNotMatch(integration, /bannerFallbackUrl/);
  assert.doesNotMatch(results, /bannerFallbackUrl/);
  assert.match(results, /view\.state === 'earned'/);
  assert.match(css, /@keyframes wave3-results-sheen/);
  for (const text of [collection, css]) {
    assert.match(text, /prefers-reduced-motion/);
    assert.match(text, /data-vfx-enabled/);
    assert.match(text, /data-vfx-quality/);
  }
});
