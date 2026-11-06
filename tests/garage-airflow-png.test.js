import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const ids = ['airflow-basic', 'airflow-slipstream', 'airflow-vortex', 'airflow-prism'];

function auditIndexedPng(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let offset = 8, width = 0, height = 0, paletteAlpha = [], idat = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = payload.readUInt32BE(0); height = payload.readUInt32BE(4);
      assert.equal(payload[8], 8); // 8-bit native indexed artwork
      assert.equal(payload[9], 3); // indexed palette with a real transparent index
    }
    if (type === 'tRNS') paletteAlpha = payload;
    if (type === 'IDAT') idat.push(payload);
    offset += length + 12;
    if (type === 'IEND') break;
  }
  assert.deepEqual([width, height], [288, 288]);
  assert.equal(paletteAlpha[0], 0, 'canvas must be truly transparent');
  const scan = inflateSync(Buffer.concat(idat));
  assert.equal(scan.byteLength, (width + 1) * height);
  let minX = width, minY = height, maxX = -1, maxY = -1, painted = 0;
  for (let y = 0; y < height; y++) {
    const row = y * (width + 1);
    assert.equal(scan[row], 0, 'generated PNG scanlines must use PNG filter 0');
    for (let x = 0; x < width; x++) {
      if ((paletteAlpha[scan[row + 1 + x]] ?? 255) <= 16) continue;
      painted++; minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  return { painted, margins: [minX, minY, width - 1 - maxX, height - 1 - maxY] };
}

test('each Airflow 3x PNG is distinct, uncropped and truly transparent', () => {
  const hashes = new Set();
  for (const id of ids) {
    const path = new URL(`../public/feature-assets/garage-vfx-skins/raster/${id}@3x.png`, import.meta.url);
    const bytes = readFileSync(path);
    const report = auditIndexedPng(bytes);
    assert.ok(report.painted > 400, `${id}: not enough artwork pixels`);
    assert.ok(Math.min(...report.margins) >= 16,
      `${id}: clipped alpha bounds ${report.margins}`);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(hashes.size, ids.length, 'every Skin has independent artwork');
});
