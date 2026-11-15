// Neon Downtown ground: the Blender-baked wet city pavement set (assets-src/neon-pavement/bake.py) beside the Neon road
// set. Same maps, packing, colour spaces and KTX2 settings as neon-asphalt; the tile is whole slabs (0.6 m x 0.3 m
// running bond) so it repeats on the joints. Every file exists, matches its hash/bytes, is UASTC + zstd with a full mip
// chain, and each texture stays inside the Neon road's per-texture share of its budget.
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

const pavement = MATERIAL_MANIFEST['neon-pavement'], road = MATERIAL_MANIFEST['neon-asphalt'];
const key = f => `${f.map}@${f.resolution}`;
const whole = (metres, step) => Math.abs(metres / step - Math.round(metres / step)) < 1e-9;

test('neon-pavement: same maps, packing and colour spaces as the Neon road; tile is whole slabs', () => {
  assert.ok(pavement, 'MATERIAL_MANIFEST has a neon-pavement entry');
  assert.equal(pavement.id, 'neon-pavement');
  assert.deepEqual(pavement.packing, road.packing, 'packed.r AO, packed.g dry roughness, packed.b puddle mask');
  const shape = files => files.map(f => [key(f), f.colorSpace]).sort();
  assert.deepEqual(shape(pavement.files), shape(road.files));
  for (const f of pavement.files) assert.match(f.url, /^materials\/neon-pavement\/pavement_(basecolor|normal|packed)_(1k|2k)\.ktx2$/);
  for (const resolution of new Set(Object.values(TIERS))) {
    assert.deepEqual(pavement.files.filter(f => f.resolution === resolution).map(f => f.map).sort(), ['baseColor', 'normal', 'packed']);
  }
  assert.equal(pavement.tileMetres, 7.2);
  assert.ok(whole(pavement.tileMetres, 0.6) && whole(pavement.tileMetres, 0.3), 'tile edge falls on slab joints');
});

test('neon-pavement: licence names a CC0 Poly Haven scan with creator; master, script and inputs pinned by hash', () => {
  assert.equal(pavement.license.id, 'CC0-1.0');
  assert.ok(pavement.license.creator.length > 0);
  assert.match(pavement.license.sourceUrl, /^https:\/\/polyhaven\.com\/a\/[a-z0-9_]+$/);
  for (const k of ['master', 'script']) {
    assert.equal(sha256(read(pavement.source[k])), pavement.source[`${k}Sha256`], `${k} drifted: rerun bake.py and update the manifest`);
  }
  assert.equal(Object.keys(pavement.source.inputSha256).length, 4);
  const readme = read('assets-src/neon-pavement/README.md').toString();
  assert.ok(readme.includes(pavement.license.sourceUrl) && readme.includes(pavement.license.creator), 'README cites the source');
  for (const [file, hash] of Object.entries(pavement.source.inputSha256)) {
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.ok(readme.includes(`\`${file}\` | \`${hash}\``), `README records the sha256 of ${file}`);
  }
  assert.ok([...pavement.files.map(f => f.url), pavement.source.master, pavement.source.script].every(p => !/\/Users\/|\/home\/|^\//.test(p)));
});

for (const file of pavement?.files ?? []) {
  test(`neon-pavement ${file.map} ${file.resolution}: file, hash, bytes, KTX2 header and colour space`, () => {
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

test('neon-pavement: budgets equal the Neon road, and every texture fits its per-texture share', () => {
  assert.deepEqual(pavement.budgets, road.budgets);
  for (const resolution of new Set(Object.values(TIERS))) {
    const files = pavement.files.filter(f => f.resolution === resolution);
    const share = road.budgets.downloadBytes[resolution] / 3;
    for (const f of files) assert.ok(f.bytes <= share, `${basename(f.url)}: ${f.bytes} bytes > ${Math.floor(share)}`);
    const total = files.reduce((sum, f) => sum + f.bytes, 0);
    assert.ok(total <= road.budgets.downloadBytes[resolution], `${resolution}: ${total} bytes`);
  }
});
