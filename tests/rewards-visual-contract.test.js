import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { placementBadgeArtwork } from '../src/finish-placement-badge.ts';

const raster = new URL('../public/feature-assets/garage-rewards-and-missions/raster/', import.meta.url);
const icons = ['mission-race', 'mission-time', 'mission-drift', 'mission-combo',
  'trophy-bronze', 'trophy-silver', 'trophy-gold', 'trophy-platinum'];

/** PNG RGBA row decoding for source alpha bounds; no browser or native image dependency. */
function alphaBounds(png) {
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.deepEqual([width, height, png[24], png[25]], [288, 288, 8, 6]);
  const chunks = [];
  for (let p = 8; p < png.length;) {
    const len = png.readUInt32BE(p), type = png.toString('ascii', p + 4, p + 8);
    if (type === 'IDAT') chunks.push(png.subarray(p + 8, p + 8 + len));
    p += len + 12;
    if (type === 'IEND') break;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4;
  let offset = 0, previous = Buffer.alloc(stride), minX = width, minY = height, maxX = -1, maxY = -1;
  let translucent = false, opaque = false;
  for (let y = 0; y < height; y++) {
    const filter = raw[offset++], row = Buffer.from(raw.subarray(offset, offset + stride));
    offset += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? row[i - 4] : 0, b = previous[i], c = i >= 4 ? previous[i - 4] : 0;
      if (filter === 1) row[i] = (row[i] + a) & 255;
      else if (filter === 2) row[i] = (row[i] + b) & 255;
      else if (filter === 3) row[i] = (row[i] + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        row[i] = (row[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      } else assert.equal(filter, 0, 'valid PNG filter');
    }
    for (let x = 0; x < width; x++) {
      const alpha = row[x * 4 + 3];
      if (alpha > 0 && alpha < 255) translucent = true;
      if (alpha === 255) opaque = true;
      if (alpha > 16) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }
    previous = row;
  }
  assert.ok(translucent && opaque, 'preserves actual RGBA transparency and antialiased edges');
  return [minX, minY, width - maxX - 1, height - maxY - 1];
}

test('all Rewards/Missions icon masters are independently encoded 3x transparent PNGs with safe alpha margins', () => {
  for (const id of icons) {
    const png = readFileSync(new URL(id + '@3x.png', raster));
    const bounds = alphaBounds(png);
    assert.ok(bounds.every(inset => inset >= 20), id + ' has cropped glow or silhouette: ' + bounds);
  }
});

test('podium uses the formal PNG master at 48 CSS px, never treats it as an awarded entitlement', () => {
  const badge = placementBadgeArtwork('gold', '/skyline-rush/');
  assert.equal(badge.src, '/skyline-rush/feature-assets/garage-rewards-and-missions/raster/trophy-gold@3x.png');
  assert.deepEqual([badge.cssSize, badge.sourcePixels], [48, 288]);
});

test('actual Garage and Results surfaces reference PNG (not just the source Gallery) and have a load fallback', () => {
  const gallery = readFileSync(new URL('../src/GarageSourceArtGallery.vue', import.meta.url), 'utf8');
  const results = readFileSync(new URL('../src/result-screen.ts', import.meta.url), 'utf8');
  const board = readFileSync(new URL('../src/GarageMissionBoard.vue', import.meta.url), 'utf8');
  const garage = readFileSync(new URL('../src/GaragePanel.vue', import.meta.url), 'utf8');
  assert.match(gallery, /@3x\\.png/);
  assert.match(results, /result-trophy-art/);
  assert.match(results, /onerror/);
  assert.match(board, /@3x\\.png/);
  assert.match(board, /Coming soon|尚未開放/);
  assert.match(garage, /GarageMissionBoard/);
});
