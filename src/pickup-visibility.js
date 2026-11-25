// Presentation only, measured in CSS pixels (never drawing-buffer pixels or quality tiers).
export const pickupTargetPixels = (aspect, height) => aspect >= .8 && height <= 500 ? 28 : 24;

// Bounded partial perspective compensation. Projected size must grow on approach.
// pixelsPerMetre is the vertical projection scale at unit camera depth.
export function pickupVisibilityScale(depth, pixelsPerMetre, worldSize, targetPixels, cap) {
  if (!Number.isFinite(depth) || !Number.isFinite(pixelsPerMetre) || !Number.isFinite(worldSize) ||
      !Number.isFinite(targetPixels) || !Number.isFinite(cap) ||
      depth <= 30 || pixelsPerMetre <= 0 || worldSize <= 0 || targetPixels <= 0 || cap <= 1) return 1;
  const knee = Math.max(30, pixelsPerMetre * worldSize / targetPixels);
  const ratio = Math.max(1, depth / knee);
  // At the knee the slope is zero; scale/depth decreases with distance even before capping.
  return Math.min(cap, .5 * (ratio + 1 / ratio));
}
