import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
const root = path => new URL('../' + path, import.meta.url);
const src = path => readFileSync(root(path), 'utf8');
const webp = path => {
 const b = readFileSync(root(path));
 assert.equal(b.toString('ascii', 0, 4), 'RIFF', path);
 assert.equal(b.toString('ascii', 8, 12), 'WEBP', path);
 assert.equal(b.readUInt32LE(4) + 8, b.length, path);
 return b;
};

test('all Wave 3 demo raster images are WebP-only, including wallet and existing approved art', () => {
 const dir='public/feature-assets/wave3-demo/raster/';
 const names=readdirSync(root(dir));
 assert.equal(names.filter(n=>n.endsWith('.png')).length,0);
 for(const id of ['demo-points','demo-claim','demo-collection-empty','demo-results-banner','wallet-coin','wallet-diamond']){
  assert.ok(existsSync(root(dir+id+'@3x.webp')),id);
  webp(dir+id+'@3x.webp');
 }
});
test('image decode failures keep text or CSS rather than silently requesting a PNG', () => {
 const c=src('src/Wave3DemoCollection.vue');
 const integration=src('src/wave3-demo-results-integration.ts');
 const ui=src('src/wave3-demo-results-ui.ts');
 const art=src('src/Wave3DemoArt.vue');
 assert.match(c,/wave3DemoArtUrl\('demo-collection-empty'\)/);
 assert.match(integration,/bannerUrl: wave3DemoArtUrl\('demo-results-banner'\)/);
 assert.doesNotMatch(integration+art+ui,/artworkFallbackUrl|\.png|['"]png['"]/);
 assert.match(ui,/img\.remove\(\)/);
});
