import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../public/feature-assets/wave3-demo/raster/', import.meta.url);
const pngSize = name => {
  const file = readFileSync(new URL(name, root));
  assert.equal(file.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', name);
  return [file.readUInt32BE(16), file.readUInt32BE(20)];
};
test('premium currency art is committed as transparent RGBA PNG at 3x display resolution', () => {
  for (const name of ['wallet-coin@3x.png', 'wallet-diamond@3x.png']) {
    assert.deepEqual(pngSize(name), [144, 144], name);
    assert.equal(readFileSync(new URL(name, root))[25], 6, name + ' must be RGBA');
  }
});
test('eight-frame alpha sparkle atlas stays a separate lightweight 64px frame sheet', () => {
  assert.deepEqual(pngSize('wallet-sparkle-strip.png'), [512, 64]);
  assert.equal(readFileSync(new URL('wallet-sparkle-strip.png', root))[25], 6);
});
test('Garage wallet uses real artwork instead of CSS-drawn coin/diamond shapes', () => {
  const view = readFileSync(new URL('../src/Wave3CurrencyStrip.vue', import.meta.url), 'utf8');
  for (const name of ['wallet-coin@3x.png', 'wallet-diamond@3x.png', 'wallet-sparkle-strip.png']) {
    assert.ok(view.includes(name), name);
  }
  assert.match(view, /prefers-reduced-motion/);
  assert.match(view, /steps\(7/);
  assert.doesNotMatch(view, /clip-path:polygon|wallet-symbol--coin|wallet-symbol--diamond/);
});
