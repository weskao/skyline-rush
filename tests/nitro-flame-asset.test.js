// The NITRO flame noise texture, checked from its decoded pixels against the contract in
// docs/designs/nitro-flame/DESIGN.md ("Shared contract > Flame noise texture").
// Rebuild: assets-src/nitro-flame/README.md. U = image columns, V = image rows (the flow axis).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const FILE = new URL('../public/feature-assets/nitro-flame/flame-noise.png', import.meta.url);
const SIZE = 512;
const MAX_BYTES = 300_000;

/** 8-bit RGB, non-interlaced PNG -> { chunks, px (rows top first, 3 bytes per pixel) }. */
function decode(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
  const chunks = [], idat = [];
  let ihdr;
  for (let o = 8; o < bytes.length;) {
    const length = bytes.readUInt32BE(o), type = bytes.toString('latin1', o + 4, o + 8);
    const data = bytes.subarray(o + 8, o + 8 + length);
    chunks.push(type);
    if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], interlace: data[12] };
    if (type === 'IDAT') idat.push(data);
    o += length + 12;
  }
  assert.deepEqual(ihdr, { width: SIZE, height: SIZE, bitDepth: 8, colorType: 2, interlace: 0 }, '512 x 512, 8-bit, colour type 2 (RGB, no alpha)');
  const stride = SIZE * 3, raw = inflateSync(Buffer.concat(idat)), px = new Uint8Array(stride * SIZE);
  assert.equal(raw.length, (stride + 1) * SIZE, 'three bytes per pixel');
  for (let y = 0; y < SIZE; y++) {
    const filter = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    assert.ok(filter <= 4, `row ${y}: PNG filter ${filter}`);
    for (let i = 0; i < stride; i++) {
      const a = i >= 3 ? px[dst + i - 3] : 0, b = y ? px[dst + i - stride] : 0, c = i >= 3 && y ? px[dst + i - stride - 3] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      px[dst + i] = raw[src + i] + [0, a, b, (a + b) >> 1, paeth][filter];
    }
  }
  return { chunks, px };
}

let cache;
function load() {
  if (!cache) {
    const bytes = readFileSync(FILE), png = decode(bytes);
    const channel = c => Float64Array.from({ length: SIZE * SIZE }, (_, i) => png.px[i * 3 + c] / 255);
    cache = { bytes, chunks: png.chunks, R: channel(0), G: channel(1), B: channel(2) };
  }
  return cache;
}

const wrap = i => (i + SIZE) % SIZE;
const at = (ch, axis, line, k) => (axis === 'v' ? ch[wrap(line) * SIZE + k] : ch[k * SIZE + wrap(line)]);
/** Mean |difference| between neighbouring lines across `axis`, one value per line, wrapping. order 1: line i to
 *  i + 1 (the wrap is entry SIZE - 1); order 2: the kink at line i (the wrap touches entries 0 and SIZE - 1). */
function roughness(ch, axis, order = 1) {
  return Float64Array.from({ length: SIZE }, (_, i) => {
    let sum = 0;
    for (let k = 0; k < SIZE; k++) {
      sum += Math.abs(order === 1 ? at(ch, axis, i + 1, k) - at(ch, axis, i, k)
        : at(ch, axis, i + 1, k) - 2 * at(ch, axis, i, k) + at(ch, axis, i - 1, k));
    }
    return sum / SIZE;
  });
}
const least = a => a.reduce((m, v) => Math.min(m, v), Infinity);   // not Math.min(...a): 262,144 arguments overflow the stack
const most = a => a.reduce((m, v) => Math.max(m, v), -Infinity);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const variance = a => { const m = mean(a); return mean(a.map(v => (v - m) ** 2)); };
const share = (ch, keep) => ch.filter(keep).length / ch.length;
/** How much wider a channel's shapes run along V than along U (1 = isotropic). */
const stretch = ch => mean(roughness(ch, 'u')) / mean(roughness(ch, 'v'));
/** Share of a channel's variance that survives averaging over 16 px blocks: high = large shapes, low = fine grain. */
function coarseShare(ch) {
  const block = 16, n = SIZE / block, means = new Float64Array(n * n);
  for (let i = 0; i < ch.length; i++) means[Math.floor(i / SIZE / block) * n + Math.floor((i % SIZE) / block)] += ch[i] / block ** 2;
  return variance(means) / variance(ch);
}
const fixed = (v, d = 3) => Number(v.toFixed(d));

test('flame noise is a 512 x 512 8-bit RGB PNG of plain data, at most 300 KB', t => {
  const { bytes, chunks } = load();   // decode() asserts size, bit depth, channel count and no alpha channel
  t.diagnostic(`bytes ${bytes.length}, chunks ${[...new Set(chunks)].join(' ')}`);
  assert.ok(bytes.length <= MAX_BYTES, `${bytes.length} bytes is over ${MAX_BYTES}`);
  // Linear data, not colour: no transparency key and no colour profile a browser could apply while decoding.
  for (const type of ['tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'cICP']) assert.ok(!chunks.includes(type), `unexpected ${type} chunk`);
});

test('R holds flame tongues: full range, large shapes stretched along V', t => {
  const { R } = load();
  const stats = { min: least(R), max: most(R), mean: fixed(mean(R)), stretch: fixed(stretch(R)), coarse: fixed(coarseShare(R)) };
  t.diagnostic(JSON.stringify(stats));
  assert.equal(stats.min, 0, 'reaches 0');
  assert.equal(stats.max, 1, 'reaches 1');
  assert.ok(stats.mean > 0.25 && stats.mean < 0.75, `mean ${stats.mean}: neither all flame nor all gap`);
  assert.ok(stats.stretch >= 1.5, `stretch ${stats.stretch}: shapes must run along V`);
  assert.ok(stats.coarse >= 0.5, `coarse share ${stats.coarse}: shapes must be large`);
});

test('G holds fine turbulence with a mean near 0.5', t => {
  const { R, G } = load();
  const stats = { min: least(G), max: most(G), mean: fixed(mean(G)), deviation: fixed(Math.sqrt(variance(G))), coarse: fixed(coarseShare(G)) };
  t.diagnostic(JSON.stringify(stats));
  assert.ok(Math.abs(stats.mean - 0.5) <= 0.02, `mean ${stats.mean}`);
  assert.ok(stats.deviation >= 0.12, `deviation ${stats.deviation}: too flat to erode or distort with`);
  assert.ok(stats.min <= 0.1 && stats.max >= 0.9, `range ${stats.min}..${stats.max}`);
  assert.ok(stats.coarse <= 0.3, `coarse share ${stats.coarse}: turbulence must be fine`);
  assert.ok(stats.coarse < coarseShare(R) / 2, 'finer than the tongues');
});

test('B holds sparse hot filaments running along V on a dark field', t => {
  const { B } = load();
  const stats = { max: most(B), mean: fixed(mean(B)), dark: fixed(share(B, v => v < 0.1)), lit: fixed(share(B, v => v > 0.5)), hot: fixed(share(B, v => v > 0.8), 4), stretch: fixed(stretch(B)) };
  t.diagnostic(JSON.stringify(stats));
  assert.ok(stats.dark >= 0.7, `dark share ${stats.dark}: mostly dark`);
  assert.ok(stats.mean <= 0.12, `mean ${stats.mean}`);
  assert.ok(stats.lit <= 0.1, `lit share ${stats.lit}: sparse`);
  assert.ok(stats.max >= 0.98 && stats.hot >= 0.003, `max ${stats.max}, hot share ${stats.hot}: the filaments must reach white-hot`);
  assert.ok(stats.stretch >= 1.5, `stretch ${stats.stretch}: filaments must run along V`);
});

test('every channel tiles on both axes: the wrap-around seam is no rougher than the interior', t => {
  const channels = load();
  for (const name of ['R', 'G', 'B']) {
    for (const axis of ['u', 'v']) {
      for (const order of [1, 2]) {
        const lines = roughness(channels[name], axis, order);
        const seamAt = order === 1 ? [SIZE - 1] : [0, SIZE - 1];
        const seam = Math.max(...seamAt.map(i => lines[i]));
        const interior = Math.max(...lines.filter((_, i) => !seamAt.includes(i)));
        t.diagnostic(`${name} ${axis} order ${order}: seam ${fixed(seam, 4)}, interior max ${fixed(interior, 4)}, interior mean ${fixed(mean(lines), 4)}`);
        assert.ok(seam <= interior, `${name} across ${axis} (order ${order}): seam ${seam} is rougher than the interior's ${interior}`);
      }
    }
  }
});
