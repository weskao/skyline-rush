import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = path => new URL('../' + path, import.meta.url);
const src = path => readFileSync(root(path), 'utf8');
const webp = path => {
 const b = readFileSync(root(path));
 assert.equal(b.toString('ascii', 0, 4), 'RIFF', path);
 assert.equal(b.toString('ascii', 8, 12), 'WEBP', path);
 assert.equal(b.readUInt32LE(4) + 8, b.length, path);
 return b;
};

test('wallet coin and diamond are native transparent WebP, 3x their 48px UI display size', () => {
 for (const id of ['wallet-coin', 'wallet-diamond']) {
  const bytes = webp('public/feature-assets/wave3-demo/raster/' + id + '@3x.webp');
  assert.equal(bytes.toString('ascii', 12, 16), 'VP8X', id + ' extended alpha WebP');
  assert.equal(bytes[20] & 0x10, 0x10, id + ' has transparency');
  const width = 1 + bytes.readUIntLE(24, 3), height = 1 + bytes.readUIntLE(27, 3);
  assert.deepEqual([width,height],[144,144],id);
 }
 const dir = 'public/feature-assets/wave3-demo/raster/';
 assert.ok(readdirSync(root(dir)).every(n => !n.endsWith('.png')));
});
test('real art is animated with object-specific motion and a readable reduced-motion alternative', () => {
 const s=src('src/Wave3CurrencyStrip.vue');
 assert.match(s,/wallet-coin@3x\.webp/);
 assert.match(s,/wallet-diamond@3x\.webp/);
 assert.match(s,/wallet-coin-orbit/);
 assert.match(s,/wallet-diamond-prism/);
 assert.match(s,/prefers-reduced-motion/);
 assert.doesNotMatch(s,/wallet-shimmer|wallet-sparkle-strip/);
});
// The restored coin (eed7045f) drew 9 px from its edge, under the 7% safe border that collectible-ui-browser.spec.js
// checks, and develop's browser shard went red (CI 44991368086). No WebP decoder is a dependency here, so this pins the
// shipped blob: a new coin passes that browser spec first, then updates this hash.
test('the shipped wallet coin is the one proven against the browser safe-border check', () => {
 const hash = createHash('sha256').update(webp('public/feature-assets/wave3-demo/raster/wallet-coin@3x.webp')).digest('hex');
 assert.equal(hash, '34495c266a14bca981f154077895917b2e428890c1030f3b3c671256bf2954c0',
  'run npx playwright test tests/collectible-ui-browser.spec.js, then update this hash');
});
