import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const raster = file => new URL('../public/feature-assets/wave3-demo/raster/' + file, import.meta.url);
const source = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');

test('A-05/A-06 ship WebP only; A-03/A-04 and wallet source PNGs are preserved', () => {
  for (const name of ['demo-collection-empty', 'demo-results-banner']) {
    assert.ok(existsSync(raster(name + '@3x.webp')), name + ' approved WebP still exists');
    assert.equal(existsSync(raster(name + '@3x.png')), false, name + ' PNG backup removed');
  }
  for (const name of ['demo-points', 'demo-claim', 'wallet-coin', 'wallet-diamond']) {
    assert.ok(existsSync(raster(name + '@3x.png')), name + ' unrelated original PNG preserved');
  }
});

test('A-05/A-06 image failure never requests removed PNGs or changes demo settlement', () => {
  const collection = source('Wave3DemoCollection.vue');
  const integration = source('wave3-demo-results-integration.ts');
  const results = source('wave3-demo-results-ui.ts');
  assert.match(collection, /wave3DemoArtUrl\('demo-collection-empty'\)/);
  assert.doesNotMatch(collection, /emptyArtFallback/);
  assert.match(integration, /bannerUrl: wave3DemoArtUrl\('demo-results-banner'\)/);
  assert.doesNotMatch(integration, /bannerFallbackUrl/);
  assert.doesNotMatch(results, /bannerFallbackUrl/);
  assert.match(results, /image\.remove\(\); banner\.hidden = true;/);
  assert.match(integration, /artworkFallbackUrl: wave3DemoArtUrl\('demo-points', 'png'\)/,
    'A-03 original PNG fallback remains intentional');
});
