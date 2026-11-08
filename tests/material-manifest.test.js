// Task 5 road material: every KTX2 file the manifest lists exists, matches its hash/bytes, is a real KTX2 with mipmaps,
// has power-of-two dimensions equal to the declared resolution, carries the declared transfer function in its DFD,
// and the tier budgets hold. Header layout: KTX 2.0 spec 3.1 (header) and 3.10 (basic data format descriptor).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MATERIAL_MANIFEST, TIERS, gpuBytesEstimate } from '../src/material-manifest.ts';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const MAGIC = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
const TRANSFER = { 1: 'linear', 2: 'srgb' };
const isPow2 = n => n > 0 && (n & (n - 1)) === 0;

function ktx2(buffer) {
  const dfd = buffer.readUInt32LE(48);
  return {
    magic: buffer.subarray(0, 12), vkFormat: buffer.readUInt32LE(12), width: buffer.readUInt32LE(20), height: buffer.readUInt32LE(24),
    levels: buffer.readUInt32LE(40), supercompression: buffer.readUInt32LE(44),
    colorModel: buffer.readUInt8(dfd + 12), transfer: TRANSFER[buffer.readUInt8(dfd + 14)],
  };
}

const entry = MATERIAL_MANIFEST['coast-asphalt'];

test('coast-asphalt: licence names a CC0 scan with creator and source URL', () => {
  assert.equal(entry.license.id, 'CC0-1.0');
  assert.ok(entry.license.creator.length > 0);
  assert.match(entry.license.sourceUrl, /^https:\/\/polyhaven\.com\/a\/asphalt_/);
});

test('coast-asphalt: source master, script and scan inputs are pinned by hash', () => {
  for (const key of ['master', 'script']) {
    assert.equal(sha256(read(entry.source[key])), entry.source[`${key}Sha256`], `${key} drifted: rerun bake.py and update the manifest`);
  }
  assert.ok(Object.keys(entry.source.inputSha256).length >= 4);
  for (const hash of Object.values(entry.source.inputSha256)) assert.match(hash, /^[0-9a-f]{64}$/);
});

test('coast-asphalt: three maps at every tier resolution, no personal paths', () => {
  const resolutions = [...new Set(Object.values(TIERS))];
  for (const resolution of resolutions) {
    assert.deepEqual(entry.files.filter(f => f.resolution === resolution).map(f => f.map).sort(), ['baseColor', 'normal', 'packed']);
  }
  assert.ok(entry.files.every(f => !/\/Users\/|\/home\//.test(f.url)));
});

for (const file of entry.files) {
  test(`coast-asphalt ${file.map} ${file.resolution}: file, hash, bytes, KTX2 header and colour space`, () => {
    const buffer = read(`public/${file.url}`);
    assert.equal(buffer.length, file.bytes, 'bytes');
    assert.equal(sha256(buffer), file.sha256, 'sha256');
    const h = ktx2(buffer);
    assert.ok(h.magic.equals(MAGIC), 'KTX2 identifier');
    assert.equal(h.vkFormat, 0, 'UASTC is a supercompressed universal format (VK_FORMAT_UNDEFINED)');
    assert.equal(h.colorModel, 166, 'UASTC colour model');
    assert.equal(h.supercompression, 2, 'zstd supercompression');
    assert.ok(isPow2(h.width) && isPow2(h.height), `power of two, got ${h.width}x${h.height}`);
    assert.deepEqual([h.width, h.height], [file.resolution, file.resolution]);
    assert.equal(h.levels, Math.log2(file.resolution) + 1, 'full mip chain');
    assert.equal(h.transfer, file.colorSpace, 'DFD transfer function matches the declared colour space');
    assert.equal(file.colorSpace, file.map === 'baseColor' ? 'srgb' : 'linear', 'only base colour is sRGB');
  });
}

test('coast-asphalt: per-tier download and GPU budgets hold', () => {
  for (const [tier, resolution] of Object.entries(TIERS)) {
    const bytes = entry.files.filter(f => f.resolution === resolution).reduce((sum, f) => sum + f.bytes, 0);
    assert.ok(bytes <= entry.budgets.downloadBytes[resolution], `${tier}: ${bytes} download bytes > ${entry.budgets.downloadBytes[resolution]}`);
    const gpu = gpuBytesEstimate(resolution);
    assert.ok(gpu <= entry.budgets.gpuBytes[tier], `${tier}: ${gpu} GPU bytes > ${entry.budgets.gpuBytes[tier]}`);
  }
  assert.ok(entry.budgets.gpuBytes.ultra >= entry.budgets.gpuBytes.high, 'Ultra never spends less than High (its extra is a shader detail pass, not memory)');
});
