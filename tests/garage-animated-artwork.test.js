import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const src = file => read('src/' + file).toString('utf8');
const root = 'public/feature-assets/garage-animated/';
const manifest = JSON.parse(read(root + 'manifest.json').toString('utf8'));
const expected = { thruster: 4, airflow: 4, 'nitro-trail': 5,
  'launch-flare': 9, 'store-concept': 3 };
// Pure specular sweeps: original static art plus the shared CSS sweep, never a GIF.
const SWEPT = ['badge-equipped', 'badge-favorite', 'badge-limited', 'badge-locked', 'badge-new',
  'badge-trial', 'rarity-common', 'rarity-rare', 'rarity-epic', 'rarity-legendary', 'rarity-mythic',
  'store-cart', 'store-star', 'store-tag'];

test('five categories use distinct original-source 3x animated GIF assets', () => {
  assert.equal(manifest.length, 25);
  assert.equal(new Set(manifest.map(item => item.name)).size, 25);
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
    assert.equal(item.width, item.category === 'store-concept' ? 216 : 288);
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
  assert.equal(hashes.size, 25, 'each original icon retains distinct animated bytes');
});

test('sweep-only icons drop their GIF and share one CSS sweep direction and cycle', () => {
  for (const name of SWEPT) {
    assert.ok(!existsSync(new URL(`../${root}${name}@3x.gif`, import.meta.url)), name + ' GIF removed');
    assert.ok(!manifest.some(item => item.name === name), name + ' not in manifest');
  }
  const tile = src('GarageArtworkTile.vue');
  assert.match(tile, /\/\^store-\(box\|bundle\|collection\)\$\/\.test\(props\.id\)/);
  assert.match(tile, /\/\^\(badge-\|rarity-\)\|\^store-\(cart\|star\|tag\)\$\/\.test\(props\.id\)/);
  assert.equal(tile.match(/animation: garage-art-sweep 6\.8s/g)?.length, 1, 'one shared cycle');
  assert.match(tile, /skewX\(-23deg\)/, 'same tilt as the paint sheen');
  assert.match(tile, /mask: var\(--sweep-mask\)/, 'sweep clipped to icon alpha');
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

test('every item has its own source-driven motion recipe, with moving physical parts rather than whole image distortion', () => {
  const generator = read('scripts/generate-garage-gifs.py').toString('utf8');
  assert.match(generator, /PROFILES = \{/);
  for (const asset of manifest) {
    assert.ok(generator.includes("'" + asset.name + "':"), asset.name + ' requires art direction');
  }
  assert.match(generator, /subtle_part_motion/);
  assert.match(generator, /hinged-crate/);
  assert.match(generator, /ribbon-bow/);
  assert.match(generator, /animate_airflow/);
  assert.doesNotMatch(generator, /metal_reflection/, 'specular sweeps live in CSS, not GIFs');
  assert.doesNotMatch(generator, /np\.rint\(xx - dx\)/, 'no whole-image pixel field warp');
});

test('Vite BASE_URL is resolved in Vue script, never inside template expression', () => {
  const skin = src('GarageSkinCatalog.vue');
  assert.match(skin, /const animatedArtworkSrc =/);
  assert.match(skin, /:animated-src="animatedArtworkSrc\(skin\.id\)"/);
  assert.doesNotMatch(skin, /:animated-src="[^"]*import\.meta/,
    'Vue template expression is not parsed as a JavaScript module');
});
