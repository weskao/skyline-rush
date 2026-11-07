// Task 4: check-glb reads texture sizes and KTX2 colour spaces from the GLB without decoding pixels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGlb, textureStats } from '../scripts/assets/check-glb.mjs';
import { validEntry } from './model-fixtures.js';

/** KTX2 header + DFD with the given size and transfer function (1 = linear, 2 = sRGB). */
function ktx2(px, transfer) {
  const out = Buffer.alloc(80 + 28);
  Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]).copy(out, 0);
  out.writeUInt32LE(px, 20);
  out.writeUInt32LE(px, 24);
  out.writeUInt32LE(80, 48);
  out.writeUInt32LE(28, 52);
  out.writeUInt32LE(28, 80);
  out[80 + 14] = transfer;
  return out;
}

function png(px) {
  const out = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(out, 0);
  out.write('IHDR', 12, 'latin1');
  out.writeUInt32BE(px, 16);
  out.writeUInt32BE(px, 20);
  return out;
}

/** glTF JSON + BIN with one image per blob; material slots map to texture indices. */
function asset(blobs, material) {
  let offset = 0;
  const bufferViews = blobs.map(b => { const v = { buffer: 0, byteOffset: offset, byteLength: b.length }; offset += b.length; return v; });
  const images = blobs.map((b, i) => ({ bufferView: i, mimeType: b[1] === 0x4b ? 'image/ktx2' : 'image/png' }));
  const textures = blobs.map((b, i) => (b[1] === 0x4b ? { extensions: { KHR_texture_basisu: { source: i } } } : { source: i }));
  return { json: { bufferViews, images, textures, materials: [material] }, bin: Buffer.concat(blobs) };
}

test('KTX2 sizes and colour spaces are read; sRGB colour + linear data passes', () => {
  const { json, bin } = asset([ktx2(1024, 2), ktx2(512, 1)], {
    pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, normalTexture: { index: 1 },
  });
  const stats = textureStats(json, bin);
  assert.equal(stats.maxTexturePx, 1024);
  assert.deepEqual(stats.colorSpaceErrors, []);
});

test('a linear KTX2 used as base colour or emissive is a colour-space violation', () => {
  const { json, bin } = asset([ktx2(256, 1)], { emissiveTexture: { index: 0 } });
  assert.deepEqual(textureStats(json, bin).colorSpaceErrors, ['texture 0 (emissiveTexture) must be sRGB']);
});

test('an sRGB KTX2 used as normal/occlusion/metallicRoughness is a colour-space violation', () => {
  const { json, bin } = asset([ktx2(256, 2)], { occlusionTexture: { index: 0 } });
  assert.deepEqual(textureStats(json, bin).colorSpaceErrors, ['texture 0 (occlusionTexture) must be linear']);
});

test('PNG sizes come from IHDR; no textures means 0 px', () => {
  const { json, bin } = asset([png(2048)], { normalTexture: { index: 0 } });
  assert.equal(textureStats(json, bin).maxTexturePx, 2048);
  assert.equal(textureStats({}, Buffer.alloc(0)).maxTexturePx, 0);
});

test('checkGlb reports colour-space errors and the texture budget', () => {
  const entry = { ...validEntry(), budgets: { ...validEntry().budgets, textureMaxPx: 1024 } };
  const summary = {
    triangles: 1, bytes: 10, nodeNames: entry.nodes, usedMaterials: entry.materials, animationNames: [], rawAnimationNames: [],
    maxTexturePx: 2048, colorSpaceErrors: ['texture 0 (normalTexture) must be linear'],
  };
  assert.deepEqual(checkGlb(summary, entry), [
    'textures: 2048px > textureMaxPx 1024',
    'textures: texture 0 (normalTexture) must be linear',
  ]);
});
