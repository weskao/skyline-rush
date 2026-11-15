// Neon night sky (Task 5b step 3, asset half): the files assets-src/neon-sky/build.py ships, on the model of
// coast-sky-manifest.test.js. Every file exists and matches its hash and bytes; the inputs are the CC0 downloads its
// licence record lists; the 1k environment maps parse; `rain` is the recorded grade of `night`; the domes are 4:1 sRGB
// UASTC + zstd KTX2 with full mips; each environment fits Coast's byte budgets; the measured key light is well formed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { COAST_ENV_VARIANTS } from '../src/coast-lighting.ts';
import { COAST_SKY_MANIFEST } from '../src/coast-sky-manifest.ts';
import { KTX2_MAGIC, ktx2 } from './helpers/ktx2.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const DIR = 'assets-src/neon-sky/';
const MANIFEST = JSON.parse(read(DIR + 'manifest.json'));
const [SOURCE] = JSON.parse(read(DIR + 'sources.json')).sources;
const ENVS = MANIFEST.environments;
const LUMA = [0.2126, 0.7152, 0.0722];

const hdr = path => {
  const buffer = read(path);
  return new HDRLoader().setDataType(THREE.FloatType).parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
};
/** Bytes Coast ships per environment: its 1k lighting HDRI plus both dome textures. */
const coastBytes = name => statSync(new URL('../public/environments/' + COAST_ENV_VARIANTS[name].file, import.meta.url)).size
  + COAST_SKY_MANIFEST.skies[name].files.reduce((sum, file) => sum + file.bytes, 0);

test('the scripts are pinned by hash, Coast\'s encoder included, and hold no personal paths', () => {
  assert.equal(MANIFEST.script, DIR + 'build.py');
  assert.equal(sha256(read(MANIFEST.script)), MANIFEST.scriptSha256, 'build.py drifted: rerun it');
  assert.equal(sha256(read(MANIFEST.encoder)), MANIFEST.encoderSha256, 'the Coast encoder drifted: rerun build.py');
  for (const file of ['build.py', 'fetch.py', 'sources.json', 'manifest.json', 'README.md']) {
    assert.doesNotMatch(read(DIR + file).toString(), /\/Users\/|\/home\/|C:\\Users/, `${file}: no personal paths`);
  }
});

test('licence record: one CC0 Poly Haven HDRI with title, author, page URL and the sha256 of every download', () => {
  assert.equal(SOURCE.license, 'CC0-1.0');
  assert.ok(SOURCE.title.length > 0 && Object.keys(SOURCE.authors).length > 0);
  assert.equal(SOURCE.url, `https://polyhaven.com/a/${SOURCE.id}`);
  assert.deepEqual(SOURCE.files.map(f => f.path), ['1k', '4k', '8k'].map(s => `${SOURCE.id}/${SOURCE.id}_${s}.hdr`));
  for (const file of SOURCE.files) {
    assert.match(file.url, /^https:\/\/dl\.polyhaven\.org\//);
    assert.match(file.sha256, /^[0-9a-f]{64}$/);
    assert.ok(file.bytes > 0);
  }
});

test('two environments, night and rain, both credited to the licence record and built from its downloads', () => {
  assert.deepEqual(Object.keys(ENVS).sort(), ['night', 'rain']);
  const downloads = Object.fromEntries(SOURCE.files.map(f => [f.path.split('/')[1], f.sha256]));
  for (const env of Object.values(ENVS)) {
    assert.deepEqual(env.credit, { license: 'CC0-1.0', creator: Object.keys(SOURCE.authors).join(', '), sourceUrl: SOURCE.url });
    assert.deepEqual(env.inputSha256, downloads);
    assert.deepEqual(env.soften, ENVS.night.soften, 'one sign soften for both');
  }
  assert.equal(ENVS.night.grade, null, 'night ships the HDRI as downloaded');
  assert.deepEqual(Object.keys(ENVS.rain.grade).sort(), ['exposure', 'falloffDeg', 'saturation', 'veil']);
});

for (const [name, env] of Object.entries(ENVS)) {
  test(`${name}: the 1k environment map exists, matches its hash and parses as a 2:1 Radiance HDR`, () => {
    assert.equal(env.environment.url, `environments/${env.file}`);
    const buffer = read('public/' + env.environment.url);
    assert.equal(buffer.length, env.environment.bytes, 'bytes');
    assert.equal(sha256(buffer), env.environment.sha256, 'sha256');
    const { width, height, data } = hdr('public/' + env.environment.url);
    assert.deepEqual([width, height], [1024, 512]);
    assert.ok(data.every(Number.isFinite), 'finite radiance');
  });

  for (const file of env.files) {
    test(`${name} ${file.width}: dome file, hash, bytes, KTX2 header, sRGB and Coast's budgets`, () => {
      assert.equal(file.url, `environments/sky/${env.file.replace('_1k.hdr', '')}_sky_${file.width / 1024}k.ktx2`);
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
    });
  }

  test(`${name}: 4K and 8K domes, and the whole environment fits the bytes of Coast's largest`, () => {
    assert.deepEqual(env.files.map(f => f.width), [4096, 8192]);
    const total = env.environment.bytes + env.files.reduce((sum, f) => sum + f.bytes, 0);
    const coast = Math.max(...['day', 'dusk', 'rain', 'fog'].map(coastBytes)); // the manifest lists Neon's own two as well
    assert.ok(total <= coast, `${total} bytes > Coast's ${coast}`);
  });

  test(`${name}: measured key light and sky data in Coast's units`, () => {
    const { key, sky } = env;
    assert.ok(Math.abs(Math.hypot(...key.direction) - 1) < 1e-3, 'unit key direction');
    assert.ok(key.direction[1] > 0, 'from the upper hemisphere');
    assert.ok(Math.abs(Math.asin(key.direction[1]) * 180 / Math.PI - key.elevationDeg) < 0.05);
    assert.match(key.color, /^#[0-9a-f]{6}$/);
    assert.ok(key.intensity > 0 && key.irradiance >= key.intensity && key.ambient > 0);
    assert.ok(Math.abs(Math.hypot(...sky.sunDirection) - 1) < 1e-3, 'brightest-texel direction, as Coast records it');
    assert.equal(sky.disc, 0, 'no sun disc at night');
    assert.ok(env.range >= 1 && env.range <= 8, 'decode range in Coast\'s bounds');
    assert.ok(sky.horizon.length === 3 && sky.p90Band0to40 > 0 && sky.p995 > sky.p90Band0to40);
  });
}

test('night ships the 1k download unchanged, as Coast does', () => {
  assert.equal(ENVS.night.environment.sha256, SOURCE.files[0].sha256);
});

test('rain is the recorded grade of night: veiled toward the horizon glow, darker and flatter', () => {
  const night = hdr('public/' + ENVS.night.environment.url), rain = hdr('public/' + ENVS.rain.environment.url);
  const { exposure, veil, falloffDeg, saturation } = ENVS.rain.grade, haze = ENVS.rain.hazeColor;
  let worst = 0;
  for (let y = 0; y < night.height; y++) {
    const elevation = Math.abs(90 - (y + 0.5) / night.height * 180);
    const t = veil * Math.exp(-elevation / falloffDeg);
    for (let x = 0; x < night.width; x++) {
      const i = (y * night.width + x) * 4, rgb = [0, 1, 2].map(c => night.data[i + c]);
      const lum = rgb.reduce((sum, v, c) => sum + v * LUMA[c], 0);
      const expected = rgb.map((v, c) => exposure * ((lum + saturation * (v - lum)) * (1 - t) + haze[c] * t));
      const peak = Math.max(...expected) + 1e-6;
      for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(rain.data[i + c] - expected[c]) / peak);
    }
  }
  assert.ok(worst < 0.03, `worst texel off by ${worst.toFixed(4)} of its brightest channel (RGBE precision)`);
  assert.ok(ENVS.rain.key.intensity < ENVS.night.key.intensity, 'darker');
  assert.ok(ENVS.rain.sky.p995 / ENVS.rain.sky.p90Band0to40 < ENVS.night.sky.p995 / ENVS.night.sky.p90Band0to40, 'hazier: lights stand out less');
});
