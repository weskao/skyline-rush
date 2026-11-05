import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const src = file => read('src/' + file).toString('utf8');
const root = 'public/feature-assets/garage-animated/';
const manifest = JSON.parse(read(root + 'manifest.json').toString('utf8'));
const expected = { thruster: 4, airflow: 4, 'nitro-trail': 5,
  'launch-flare': 9, 'badges-rarity': 11, 'store-concept': 6 };

test('all six categories use distinct original-source 3x animated GIF assets', () => {
  assert.equal(manifest.length, 39);
  assert.equal(new Set(manifest.map(item => item.name)).size, 39);
  const counts = Object.fromEntries(Object.keys(expected).map(cat =>
    [cat, manifest.filter(item => item.category === cat).length]));
  assert.deepEqual(counts, expected);
  const hashes = new Set();
  for (const item of manifest) {
    assert.ok(existsSync(new URL('../' + item.source, import.meta.url)), item.source);
    const gif = read(item.file);
    assert.equal(item.size, gif.length, item.name + ' manifest size');
    assert.ok(gif.length < 1_000_000, item.name + ' decoding budget');
    assert.equal(gif.toString('ascii', 0, 6), 'GIF89a', item.name);
    assert.equal(gif.readUInt16LE(6), item.width, item.name + ' native 3x width');
    assert.equal(gif.readUInt16LE(8), item.height, item.name + ' native 3x height');
    assert.equal(item.width, item.category === 'badges-rarity' || item.category === 'store-concept' ? 216 : 288);
    assert.ok(gif.includes(Buffer.from('NETSCAPE2.0')), item.name + ' infinite loop');
    const gce = Buffer.from([0x21, 0xf9, 0x04]);
    let index = 0, frames = 0, transparent = 0;
    while ((index = gif.indexOf(gce, index)) !== -1) {
      if (gif[index + 3] & 1) transparent++;
      frames++;
      index += gce.length;
    }
    assert.ok(frames >= 4 && transparent > 0, item.name + ' multiple transparent frames');
    hashes.add(createHash('sha256').update(gif).digest('hex'));
  }
  assert.equal(hashes.size, 39, 'each original icon retains distinct animated bytes');
});

test('production cards use native animation instead of sparkle overlays and respect fallbacks', () => {
  const image = src('GarageArtworkImage.vue');
  assert.match(image, /animatedSrc/);
  assert.match(image, /IntersectionObserver/);
  assert.match(image, /prefers-reduced-motion: reduce/);
  assert.match(image, /animationFailed\.value = true/);
  assert.match(image, /return props\.src/);
  const skin = src('GarageSkinCatalog.vue');
  assert.match(skin, /:animated-src=/);
  assert.doesNotMatch(skin, /sparkle@3x\.gif/);
  const tile = src('GarageArtworkTile.vue');
  assert.match(tile, /garage-animated\/\$\{props\.id\}@3x\.gif/);
  assert.doesNotMatch(tile, /sparkle-badges@3x\.gif/);
  assert.doesNotMatch(src('GaragePaintPreview.vue'), /sparkle-paint@3x\.gif/);
  assert.match(src('GaragePanel.vue'), /id="garage-preview"/);
});

test('renderer has separate motion behavior and a moving box lid, without shared overlay', () => {
  const generator = read('scripts/generate-garage-gifs.py').toString('utf8');
  for (const category of Object.keys(expected)) {
    assert.ok(generator.includes('category == "' + category + '"'), category);
  }
  assert.ok(generator.includes('out[lid] = 0') && generator.includes('ys - lift'),
    'store box moves its lid separately from the base');
});
