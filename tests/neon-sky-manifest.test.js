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
  assert.equal(MANIFEST.io, DIR + 'hdr_io.py', 'the Radiance reader/writer build.py runs');
  assert.equal(sha256(read(MANIFEST.io)), MANIFEST.ioSha256, 'hdr_io.py drifted: rerun build.py');
  for (const file of ['build.py', 'hdr_io.py', 'fetch.py', 'sources.json', 'manifest.json', 'README.md']) {
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
  assert.equal(ENVS.night.grade, null, 'night is not graded');
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

// Trap (2026-11-16): the source's near floodlit embankment buildings (lon -180..-84, up to 43 degrees) sat at 8x the rest
// of the sky, and the harbour drives straight at them: a wall of blurred yellow buildings instead of a night sky.
const median = values => [...values].sort((a, b) => a - b)[values.length >> 1];
for (const [name, env] of Object.entries(ENVS)) {
  test(`${name}: no heading's sky is a floodlit wall: every 30-degree bin of the dome stays within 3x the median`, () => {
    const { bandByLon, sourceBandByLon } = env.sky;
    assert.equal(bandByLon?.length, 12, 'twelve 30-degree bins, elevation 0..45, measured on the shipped dome');
    assert.ok(Math.max(...sourceBandByLon) > 3 * median(sourceBandByLon), 'the source has the wall the fill replaces');
    bandByLon.forEach((v, i) => assert.ok(v <= 3 * median(bandByLon), `lon ${-180 + 30 * i}: ${v} > 3x median ${median(bandByLon)}`));
  });

  // Same wall, the key light (2026-11-16): measured on the shipped map, its vector irradiance (90% the wall's) made a sun
  // at 27-31 degrees straight down the harbour, and its specular whited out the wet road and the car (road-ahead mean
  // 210/255, 1.3% clipped; 112 with the key off). The key aims from the filled sky and keeps the road's irradiance.
  test(`${name}: the key light is not the floodlit wall: aimed from the filled sky, same irradiance on the road`, () => {
    const { key } = env, { source } = key ?? {};
    assert.ok(source?.elevationDeg < 35, 'the shipped map alone puts the key low, on the wall');
    assert.ok(key.elevationDeg >= 45, `key at ${key.elevationDeg} degrees: a low key glints white off the wet road`);
    const flat = v => Math.hypot(v[0], v[2]), dot = key.direction.reduce((s, v, i) => s + v * source.direction[i], 0);
    assert.ok(dot < Math.cos(25 * Math.PI / 180) && flat(key.direction) < flat(source.direction), 'moved off the wall');
    const road = k => k.intensity * Math.sin(k.elevationDeg * Math.PI / 180);
    assert.ok(Math.abs(road(key) / road(source) - 1) < 5e-3, 'the road keeps the irradiance of the measured key');
  });

  // Same key, its azimuth (2026-11-16): where the filled sky put night's key (el 58), the player car's rear deck mirrored
  // it into the chase camera along the harbour, 119 degrees off the heading (tests/neon-lighting.test.js has the band).
  // The build turns it onto the nearest street axis; rain's (el 76.7) measured clean and stays on the filled sky's.
  test(`${name}: the key keeps the filled sky's elevation; night's is turned onto the nearest street axis`, () => {
    const { direction, filled } = env.key, ahead = COAST_ENV_VARIANTS[name === 'rain' ? 'nightRain' : name].sky.ahead;
    const azimuth = v => Math.atan2(v[2], v[0]) * 180 / Math.PI;
    assert.equal(direction[1], filled?.direction[1], 'same elevation, so the same irradiance on the road');
    if (name === 'rain') return assert.deepEqual(direction, filled.direction);
    const offAxis = ((azimuth(direction) - ahead) % 90 + 90) % 90; // the runtime turns `sky.ahead` to -z: the street axes
    assert.ok(Math.min(offAxis, 90 - offAxis) < 0.05, `${offAxis.toFixed(2)} degrees past a street axis`);
    assert.ok(Math.abs((azimuth(direction) - azimuth(filled.direction) + 540) % 360 - 180) <= 45, 'the nearest axis');
  });
}

// Same wall, the 1k maps (2026-11-16): shipped as downloaded, the wet road mirrored the wall in the rain harbour as a tan
// sheen (road-ahead RGB 128/105/82; 17/255 with the environment off, 105 with the key off). Both maps carry the fill and
// keep the wall's light as overhead city glow, so the city is lit by the download's horizontal irradiance.
const upperRows = ({ width, height, data }, fn) => {
  for (let y = 0; y < height / 2; y++) {
    const el = 90 - (y + 0.5) / height * 180;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      fn(el, x, LUMA.reduce((sum, w, c) => sum + w * data[i + c], 0));
    }
  }
};
for (const [name, env] of Object.entries(ENVS)) {
  test(`${name}: the 1k map's sky is not a floodlit wall either: every 30-degree bin within 3x the median`, () => {
    const map = hdr('public/' + env.environment.url), sums = Array(12).fill(0), counts = Array(12).fill(0);
    upperRows(map, (el, x, lum) => { if (el < 45) { const b = Math.floor(x * 12 / map.width); sums[b] += lum; counts[b]++; } });
    const bins = sums.map((s, i) => s / counts[i]);
    bins.forEach((v, i) => assert.ok(v <= 3 * median(bins), `lon ${-180 + 30 * i}: ${v.toFixed(3)} > 3x median ${median(bins).toFixed(3)}`));
  });
}

test('night\'s 1k map keeps the download\'s horizontal irradiance: the wall\'s light moves overhead, not away', () => {
  const map = hdr('public/' + ENVS.night.environment.url), { source, shipped } = ENVS.night.irradiance ?? {};
  let eh = 0;
  const dOmega = (Math.PI / map.height) * (2 * Math.PI / map.width), rad = Math.PI / 180;
  upperRows(map, (el, x, lum) => { eh += lum * Math.sin(el * rad) * Math.cos(el * rad) * dOmega; });
  assert.ok(Math.abs(eh / shipped - 1) < 0.01, `measured ${eh.toFixed(4)} vs recorded ${shipped}`);
  assert.ok(Math.abs(shipped / source - 1) < 0.01, `shipped ${shipped} vs download ${source}`);
});

// Trap (2026-11-16): the sign soften blurred the whole band from the horizon to 22 degrees and halved the far skyline's
// gradient, so it read soft at High whatever the dome's resolution (8K softened measured the same as 4K softened).
for (const [name, env] of Object.entries(ENVS)) {
  test(`${name}: the far skyline keeps the download's edges: only LED facades are softened`, () => {
    const { sharpness, sourceSharpness } = env.sky;
    assert.equal(sharpness?.length, 2, 'mean |gradient| of log luminance per degree, x and y, lon -70..110, el 0..22');
    sharpness.forEach((v, i) => assert.ok(v >= 0.7 * sourceSharpness[i], `${'xy'[i]}: ${v} < 0.7 x the download's ${sourceSharpness[i]}`));
    assert.ok(env.soften.signs.chroma > 0 && env.soften.signs.peak > 0, 'the soften keys on LED facades');
  });
}

// Trap (2026-11-16): the fill's pieces alternate two source spans whose clouds differ 30 to 40% in luminance, joined by
// an 8 degree feather: a brightness step at every piece boundary (1.11 to 1.31 on the 4K night dome, elevation 27..50;
// 1.10 to 1.27 on the 1k map, 27..38). The pieces are levelled to the sky beside the wedge. jump = max(l / r, r / l) of
// the mean luminance of the 8 degrees either side of a boundary, 4 degrees clear of it.
const STEP_LIMIT = 1.1;
for (const [name, env] of Object.entries(ENVS)) {
  test(`${name}: no brightness step where two fill pieces meet, on the dome or on the 1k map`, () => {
    const bounds = [env.fill.lonDeg[0], ...env.fill.pieces.map(p => p.lonDeg[1])];
    assert.equal(env.sky.fillSteps?.length, bounds.length, 'one jump per piece boundary, measured on the shipped 4K dome');
    env.sky.fillSteps.forEach((v, i) => assert.ok(v <= STEP_LIMIT, `dome, lon ${bounds[i]}: jump ${v} > ${STEP_LIMIT}`));
    const map = hdr('public/' + env.environment.url), cols = new Float64Array(map.width);
    upperRows(map, (el, x, lum) => { if (el >= 27 && el < 38) cols[x] += lum; });
    const side = from => { // mean over 8 degrees of longitude starting at `from`, wrapping
      let sum = 0, n = 0;
      for (let x = 0; x < map.width; x++) if ((((x + 0.5) / map.width - 0.5) * 360 - from + 720) % 360 <= 8) { sum += cols[x]; n++; }
      return sum / n;
    };
    for (const b of bounds) {
      const l = side(b - 12), r = side(b + 4), jump = Math.max(l / r, r / l);
      assert.ok(jump <= STEP_LIMIT, `1k map, lon ${b}: jump ${jump.toFixed(3)} > ${STEP_LIMIT}`);
    }
  });
}

// Violet storm (concept frame 07): the tint moves the dim sky and the rain veil toward violet at the same luminance, so
// the irradiance, band and sharpness guards above still measure the download's light. The 1k maps carry `env` of the
// tint: the wet road mirrors them, and at the full share the rain harbour road read violet ([95,71,115]).
test('violet storm: the rain veil and the dim night sky lean violet (blue over red over green), lamps untouched', () => {
  const { colour, sky, haze, env, fullBelow, noneAbove } = MANIFEST.tint ?? {};
  assert.ok(colour?.[2] > colour[0] && colour[0] > colour[1], 'tint colour: violet');
  assert.ok(sky > 0 && sky <= 1 && haze > 0 && haze <= 1 && fullBelow < noneAbove, 'shares, and a luminance mask that spares the lamps');
  assert.ok(env > 0 && env < 0.5, `the 1k maps carry a small share of the tint: ${env}`);
  const [r, g, b] = ENVS.rain.domeHazeColor ?? [];
  assert.ok(b > r && r > 1.3 * g, `rain veil colour on the dome ${ENVS.rain.domeHazeColor}`);
  const [er, eg, eb] = ENVS.rain.hazeColor;
  assert.ok(eb > eg && er < 1.25 * eg, `rain veil colour on the 1k map ${ENVS.rain.hazeColor}: off tan, short of violet`);
  const map = hdr('public/' + ENVS.night.environment.url), mean = [0, 0, 0];
  for (let y = 0; y < map.height / 2; y++) {
    const el = 90 - (y + 0.5) / map.height * 180;
    if (el < 25 || el >= 38) continue; // above the skyline's lamps, below the overhead glow
    for (let x = 0; x < map.width; x++) for (let c = 0; c < 3; c++) mean[c] += map.data[(y * map.width + x) * 4 + c];
  }
  assert.ok(mean[2] > mean[0] && mean[0] >= 1.08 * mean[1], `night sky, elevation 25..38: ${mean.map(v => v.toFixed(0))}`);
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
