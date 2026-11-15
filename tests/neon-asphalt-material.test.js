// Task 5b step 4 Neon road material: the Blender-baked KTX2 set (assets-src/neon-asphalt/bake.py) is a drop-in for the
// Coast set: same file names, sizes, packing and 24 m tile, so src/coast-road-material.ts loads it by set name alone.
// Every listed file exists, matches its hash/bytes, is UASTC + zstd with a full mip chain at the declared size, carries
// the declared transfer function in its DFD, and the set fits inside Coast's byte budget (owner decision N6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { MATERIAL_MANIFEST, TIERS } from '../src/material-manifest.ts';
import { KTX2_MAGIC as MAGIC, ktx2 } from './helpers/ktx2.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

const neon = MATERIAL_MANIFEST['neon-asphalt'], coast = MATERIAL_MANIFEST['coast-asphalt'];
const key = f => `${f.map}@${f.resolution}`;

test('neon-asphalt: drop-in for coast-asphalt (file names, sizes, colour spaces, packing, tile)', () => {
  assert.ok(neon, 'MATERIAL_MANIFEST has a neon-asphalt entry');
  assert.equal(neon.id, 'neon-asphalt');
  assert.equal(neon.tileMetres, coast.tileMetres);
  assert.deepEqual(neon.packing, coast.packing, 'packed.r AO, packed.g dry roughness, packed.b puddle mask');
  const shape = files => files.map(f => [key(f), basename(f.url), f.colorSpace]).sort();
  assert.deepEqual(shape(neon.files), shape(coast.files));
  for (const f of neon.files) assert.equal(f.url, `materials/neon-asphalt/${basename(f.url)}`);
  for (const resolution of new Set(Object.values(TIERS))) {
    assert.deepEqual(neon.files.filter(f => f.resolution === resolution).map(f => f.map).sort(), ['baseColor', 'normal', 'packed']);
  }
});

test('neon-asphalt: licence names a CC0 Poly Haven scan with creator; master, script and inputs pinned by hash', () => {
  assert.equal(neon.license.id, 'CC0-1.0');
  assert.ok(neon.license.creator.length > 0);
  assert.match(neon.license.sourceUrl, /^https:\/\/polyhaven\.com\/a\/asphalt_/);
  for (const k of ['master', 'script']) {
    assert.equal(sha256(read(neon.source[k])), neon.source[`${k}Sha256`], `${k} drifted: rerun bake.py and update the manifest`);
  }
  assert.equal(Object.keys(neon.source.inputSha256).length, 4);
  for (const hash of Object.values(neon.source.inputSha256)) assert.match(hash, /^[0-9a-f]{64}$/);
  assert.ok([...neon.files.map(f => f.url), neon.source.master, neon.source.script].every(p => !/\/Users\/|\/home\/|^\//.test(p)));
});

for (const file of neon.files) {
  test(`neon-asphalt ${file.map} ${file.resolution}: file, hash, bytes, KTX2 header and colour space`, () => {
    const buffer = read(`public/${file.url}`);
    assert.equal(buffer.length, file.bytes, 'bytes');
    assert.equal(sha256(buffer), file.sha256, 'sha256');
    const h = ktx2(buffer);
    assert.ok(h.magic.equals(MAGIC), 'KTX2 identifier');
    assert.equal(h.vkFormat, 0, 'UASTC (VK_FORMAT_UNDEFINED)');
    assert.equal(h.colorModel, 166, 'UASTC colour model');
    assert.equal(h.supercompression, 2, 'zstd supercompression');
    assert.deepEqual([h.width, h.height], [file.resolution, file.resolution]);
    assert.equal(h.levels, Math.log2(file.resolution) + 1, 'full mip chain');
    assert.equal(h.transfer, file.colorSpace, 'DFD transfer function matches the declared colour space');
    assert.equal(file.colorSpace, file.map === 'baseColor' ? 'srgb' : 'linear', 'only base colour is sRGB');
  });
}

test('neon-asphalt: byte budget no larger than Coast (N6), and every tier fits it', () => {
  for (const [resolution, bytes] of Object.entries(neon.budgets.downloadBytes)) {
    assert.ok(bytes <= coast.budgets.downloadBytes[resolution], `download budget ${resolution}`);
  }
  for (const [tier, bytes] of Object.entries(neon.budgets.gpuBytes)) assert.ok(bytes <= coast.budgets.gpuBytes[tier], `GPU budget ${tier}`);
  for (const resolution of new Set(Object.values(TIERS))) {
    const total = neon.files.filter(f => f.resolution === resolution).reduce((sum, f) => sum + f.bytes, 0);
    assert.ok(total <= neon.budgets.downloadBytes[resolution], `${resolution}: ${total} bytes > ${neon.budgets.downloadBytes[resolution]}`);
  }
});
