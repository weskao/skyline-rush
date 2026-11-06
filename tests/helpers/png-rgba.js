import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';

/** Decodes a non-interlaced 8-bit RGBA PNG into raw pixels, undoing all five row filters. */
export function decodePngRgba(png) {
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'real PNG signature');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.deepEqual([png[24], png[25], png[28]], [8, 6, 0], '8-bit RGBA, not interlaced');
  const chunks = [];
  for (let p = 8; p < png.length;) {
    const len = png.readUInt32BE(p), type = png.toString('ascii', p + 4, p + 8);
    if (type === 'IDAT') chunks.push(png.subarray(p + 8, p + 8 + len));
    p += len + 12;
    if (type === 'IEND') break;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert.ok(filter <= 4, 'valid PNG row filter');
    for (let i = 0; i < stride; i++) {
      const at = y * stride + i, value = raw[y * (stride + 1) + 1 + i];
      const a = i >= 4 ? pixels[at - 4] : 0, b = y ? pixels[at - stride] : 0, c = y && i >= 4 ? pixels[at - stride - 4] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predictor = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      pixels[at] = (value + predictor) & 255;
    }
  }
  return { width, height, pixels };
}

/** Sizes of the 8-connected regions whose alpha exceeds `threshold`, largest first. */
export function alphaComponentSizes({ width, height, pixels }, threshold = 16) {
  const seen = new Uint8Array(width * height), sizes = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || pixels[start * 4 + 3] <= threshold) continue;
    let size = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const at = stack.pop(), x = at % width, y = (at - x) / width;
      size++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[next] || pixels[next * 4 + 3] <= threshold) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }
    sizes.push(size);
  }
  return sizes.sort((a, b) => b - a);
}
