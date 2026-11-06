import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Decoded size of a WebP from its header: VP8X canvas, lossless VP8L or lossy VP8.
function webpSize(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  const kind = bytes.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
  if (kind === 'VP8L') { const bits = bytes.readUInt32LE(21); return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]; }
  assert.equal(kind, 'VP8 ');
  return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
}

test('all 18 HUD/control 3x source images decode at 432x156 (button-*) or 216x216, 3x their 144x52 / 72x72 CSS size', () => {
  const vue = readFileSync(new URL('../src/HudSourceArtwork.vue', import.meta.url), 'utf8');
  const names = [...vue.match(/const names = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.equal(names.length, 18);
  for (const name of names) {
    const file = new URL(`../public/feature-assets/mobile-controls-hud/raster/${name}@3x.webp`, import.meta.url);
    assert.deepEqual(webpSize(readFileSync(file)), name.startsWith('button-') ? [432, 156] : [216, 216], name);
  }
});
