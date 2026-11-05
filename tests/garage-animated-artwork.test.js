import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');

test('Garage and Preview Studio use looping 3x GIF layers without replacing native artwork', () => {
  for (const [name, width, height] of [
    ['sparkle-badges@3x.gif', 216, 216],
    ['sparkle@3x.gif', 288, 288],
    ['sparkle-paint@3x.gif', 960, 510],
  ]) {
    const gif = readFileSync(new URL('../public/feature-assets/garage-animated/' + name, import.meta.url));
    assert.equal(gif.toString('ascii', 0, 6), 'GIF89a', name);
    assert.equal(gif.readUInt16LE(6), width, name + ' native width');
    assert.equal(gif.readUInt16LE(8), height, name + ' native height');
    assert.ok(gif.includes(Buffer.from('NETSCAPE2.0')), name + ' must loop');
    const gce = Buffer.from([0x21, 0xf9, 0x04]);
    let frames = 0, index = 0;
    while ((index = gif.indexOf(gce, index)) >= 0) { frames++; index += gce.length; }
    assert.ok(frames >= 4, name + ' needs multiple frames');
  }
  for (const [file, gif] of [
    ['GarageArtworkTile.vue', 'sparkle-badges@3x.gif'],
    ['GarageSkinCatalog.vue', 'sparkle@3x.gif'],
    ['GaragePaintPreview.vue', 'sparkle-paint@3x.gif'],
  ]) {
    assert.match(source(file), /garage-animated-gif/, file);
    assert.ok(source(file).includes(gif), file + ' must render the correct 3x GIF');
    assert.match(source(file), /prefers-reduced-motion: reduce/, file);
  }
  assert.match(source('GaragePanel.vue'), /id="garage-preview"/, 'interactive 3D remains');
  assert.ok(source('GaragePaintPreview.vue').includes('@3x.webp'), 'native 3x original remains underneath');
});
