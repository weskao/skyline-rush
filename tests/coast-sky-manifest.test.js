// Coast sky dome textures: every KTX2 the manifest lists exists, matches its hash and bytes, is a 4:1 sRGB UASTC + zstd
// file with a full mip chain, comes from the same CC0 Poly Haven HDRI that lights the preset, and fits the budgets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { COAST_ENV_VARIANTS } from '../src/coast-lighting.ts';
import { COAST_SKY_MANIFEST } from '../src/coast-sky-manifest.ts';
import { KTX2_MAGIC, ktx2 } from './helpers/ktx2.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

test('the build script is pinned by hash and reads the sky sources from outside the repo', () => {
  const script = read(COAST_SKY_MANIFEST.script);
  assert.equal(sha256(script), COAST_SKY_MANIFEST.scriptSha256, 'build.py drifted: rerun it and update the manifest');
  assert.doesNotMatch(script.toString(), /\/Users\/|\/home\//, 'no personal paths');
});

for (const [name, sky] of Object.entries(COAST_SKY_MANIFEST.skies)) {
  const variant = COAST_ENV_VARIANTS[name], asset = variant.file.replace('_1k.hdr', '');
  test(`${name}: the dome shows the HDRI that lights the preset, a CC0 scan with creator and source URL`, () => {
    assert.deepEqual(Object.keys(sky.inputSha256).sort(), [`${asset}_4k.hdr`, `${asset}_8k.hdr`]);
    for (const hash of Object.values(sky.inputSha256)) assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(variant.credit.license, 'CC0-1.0');
    assert.ok(variant.credit.creator.length > 0);
    assert.equal(variant.credit.sourceUrl, `https://polyhaven.com/a/${asset}`);
    assert.deepEqual(sky.files.map(file => file.width), [4096, 8192]);
  });
  for (const file of sky.files) {
    test(`${name} ${file.width}: file, hash, bytes, KTX2 header, sRGB and budgets`, () => {
      assert.equal(file.url, `environments/sky/${asset}_sky_${file.width / 1024}k.ktx2`);
      const buffer = read(`public/${file.url}`);
      assert.equal(buffer.length, file.bytes, 'bytes');
      assert.equal(sha256(buffer), file.sha256, 'sha256');
      const h = ktx2(buffer);
      assert.ok(h.magic.equals(KTX2_MAGIC), 'KTX2 identifier');
      assert.deepEqual([h.vkFormat, h.colorModel, h.supercompression], [0, 166, 2], 'UASTC + zstd');
      assert.deepEqual([h.width, h.height], [file.width, file.width / 4], 'upper hemisphere of a 2:1 equirect');
      assert.equal(h.levels, Math.log2(file.width) + 1, 'full mip chain');
      assert.equal(h.transfer, 'srgb');
      assert.ok(file.bytes <= COAST_SKY_MANIFEST.budgets.downloadBytes[file.width], `${file.bytes} download bytes`);
      assert.ok(Math.round(file.width * file.width / 4 * 4 / 3) <= COAST_SKY_MANIFEST.budgets.gpuBytes[file.width], 'GPU bytes at 8 bpp with mips');
    });
  }
}
