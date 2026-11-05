import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');

test('Garage and Preview Studio artwork layers play a real looping GIF above the original 3x art', () => {
  const gif = readFileSync(new URL('../public/feature-assets/garage-animated/sparkle@3x.gif', import.meta.url));
  assert.equal(gif.toString('ascii', 0, 6), 'GIF89a');
  assert.equal(gif.readUInt16LE(6), 288);
  assert.equal(gif.readUInt16LE(8), 288);
  assert.ok(gif.includes(Buffer.from('NETSCAPE2.0')), 'GIF must repeat');
  const gce = Buffer.from([0x21, 0xf9, 0x04]);
  let frames = 0, index = 0;
  while ((index = gif.indexOf(gce, index)) >= 0) { frames++; index += gce.length; }
  assert.ok(frames >= 4, 'at least four distinct animation frames');
  for (const file of ['GarageArtworkTile.vue', 'GarageSkinCatalog.vue', 'GaragePaintPreview.vue']) {
    assert.match(source(file), /garage-animated-gif/);
    assert.match(source(file), /prefers-reduced-motion: reduce/);
  }
  assert.match(source('GaragePanel.vue'), /id="garage-preview"/, 'interactive 3D remains');
  assert.match(source('GaragePaintPreview.vue'), /@3x\.webp/, 'native 3x originals remain under GIF');
});
