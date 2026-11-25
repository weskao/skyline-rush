// Presentation only, measured in CSS pixels (never drawing-buffer pixels or quality tiers).
export const pickupTargetPixels = (aspect, height) => aspect >= .8 && height <= 500 ? 28 : 24;

// Smoothly introduce a bounded projection correction after the collection approach.
// pixelsPerMetre is the vertical projection scale at unit camera depth.
export function pickupVisibilityScale(depth, pixelsPerMetre, worldSize, targetPixels, cap) {
  if (!Number.isFinite(depth) || !Number.isFinite(pixelsPerMetre) || !Number.isFinite(worldSize) ||
      !Number.isFinite(targetPixels) || !Number.isFinite(cap) ||
      depth <= 30 || pixelsPerMetre <= 0 || worldSize <= 0 || cap <= 1) return 1;
  const t = Math.min(1, (depth - 30) / 70);
  const desired = Math.min(cap, Math.max(1, targetPixels * depth / (pixelsPerMetre * worldSize)));
  return 1 + (desired - 1) * t * t * (3 - 2 * t);
}
