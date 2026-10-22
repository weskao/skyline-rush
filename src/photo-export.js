// Browser export helpers: no backend, replay or added dependencies.
export function photoFov(value) {
  return Number.isFinite(value) ? Math.max(35, Math.min(85, value)) : 58;
}
export function flipRgbaRows(pixels, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
    width * height > 16_000_000 || pixels.length !== width * height * 4)
    throw new RangeError('Invalid photo buffer');
  const stride = width * 4;
  const flipped = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++)
    flipped.set(pixels.subarray(y * stride, (y + 1) * stride), (height - 1 - y) * stride);
  return flipped;
}
export function photoFilename(trackId, at = new Date()) {
  const id = /^[a-z][a-z0-9-]{1,30}$/.test(trackId) ? trackId : 'race';
  const stamp = at.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `skyline-rush-${id}-${stamp}.png`;
}
