// Tiling cloud noise for the Sky Spiral cloud sea (spiral-clouds.ts), made on the CPU when the look's kit joins the
// scene: no asset to ship or to keep in step. Inverted Worley cells give the rounded tops and tucked creases of
// cumulus, a gradient noise breaks their regular size (the usual Perlin-Worley mix). Every lattice wraps at the
// texture's edge, so the map repeats without a seam.
import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat } from 'three';

/** Slope channels store 0.5 + CLOUD_SLOPE x (height change per texel); the steepest crease stays inside a byte. */
export const CLOUD_SLOPE = 6;

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647) | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
/** 1 at a cell's feature point, 0 a cell away: `period` cells across the tile. */
function billow(u: number, v: number, period: number, seed: number): number {
  const x = u * period, y = v * period, cx = Math.floor(x), cy = Math.floor(y);
  let nearest = 1;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const px = (cx + i + period) % period, py = (cy + j + period) % period;
    const dx = cx + i + hash(px, py, seed) - x, dy = cy + j + hash(px, py, seed + 1) - y;
    nearest = Math.min(nearest, dx * dx + dy * dy);
  }
  return 1 - Math.sqrt(nearest);
}
const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
/** Gradient noise in about -0.7..0.7. */
function gradient(u: number, v: number, period: number, seed: number): number {
  const x = u * period, y = v * period, cx = Math.floor(x), cy = Math.floor(y), fx = x - cx, fy = y - cy;
  const corner = (i: number, j: number): number => {
    const angle = hash((cx + i) % period, (cy + j) % period, seed) * Math.PI * 2;
    return Math.cos(angle) * (fx - i) + Math.sin(angle) * (fy - j);
  };
  const top = corner(0, 0) + (corner(1, 0) - corner(0, 0)) * fade(fx), bottom = corner(0, 1) + (corner(1, 1) - corner(0, 1)) * fade(fx);
  return top + (bottom - top) * fade(fy);
}
function normalised(field: Float32Array): Float32Array {
  let low = Infinity, high = -Infinity;
  for (const value of field) { low = Math.min(low, value); high = Math.max(high, value); }
  return field.map(value => (value - low) / (high - low));
}

/** RGBA8, `size` square: R the billow height (0 crease, 1 crown), G and B its slope along u and v (CLOUD_SLOPE),
 *  A a finer, independent billow. About 40 ms at 256. */
export function cloudNoise(size = 256): Uint8Array {
  const height = new Float32Array(size * size), fine = new Float32Array(size * size);
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const u = (column + .5) / size, v = (row + .5) / size, i = row * size + column;
    const cells = billow(u, v, 4, 11) * .6 + billow(u, v, 8, 23) * .27 + billow(u, v, 16, 37) * .13;
    const drift = gradient(u, v, 4, 5) + gradient(u, v, 8, 7) * .5 + gradient(u, v, 16, 9) * .25;
    height[i] = cells * (.72 + .4 * drift);
    fine[i] = billow(u, v, 8, 53) * .6 + billow(u, v, 16, 67) * .3 + billow(u, v, 32, 71) * .1;
  }
  const h = normalised(height), detail = normalised(fine), data = new Uint8Array(size * size * 4);
  const byte = (value: number): number => Math.round(255 * Math.min(1, Math.max(0, value)));
  const at = (column: number, row: number): number => h[(row + size) % size * size + (column + size) % size]!;
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const i = (row * size + column) * 4;
    data[i] = byte(at(column, row));
    data[i + 1] = byte(.5 + CLOUD_SLOPE * (at(column + 1, row) - at(column - 1, row)) / 2);
    data[i + 2] = byte(.5 + CLOUD_SLOPE * (at(column, row + 1) - at(column, row - 1)) / 2);
    data[i + 3] = byte(detail[row * size + column]!);
  }
  return data;
}

export function createCloudNoise(size = 256): DataTexture {
  const texture = new DataTexture(cloudNoise(size), size, size, RGBAFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping; texture.colorSpace = NoColorSpace;
  texture.minFilter = LinearMipmapLinearFilter; texture.magFilter = LinearFilter; texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
