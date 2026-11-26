// Presentation only, measured in CSS pixels (never drawing-buffer pixels or quality tiers).
export const pickupTargetPixels = (aspect, height) => aspect >= .8 && height <= 500 ? 28 : 24;

// Model and halo caps. A short landscape phone loses most of its height to the HUD, so it may
// compensate further; the bound keeps a far item from towering over tunnels and signs.
export function pickupVisibilityCaps(height) {
  const short = Number.isFinite(height) && height > 0 ? Math.min(1.45, Math.max(1, 720 / height)) : 1;
  return { model: 1.9 * short, halo: 2.8 * short };
}

// Portrait only: tank and overcharge ease to 85% between about 15 and 50 m so they do not cover
// the car, and return to full size by collection depth. Projected size still grows on approach.
const NEAR_EASED = new Set(['tank', 'overcharge']);
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function pickupNearScale(depth, aspect, tier) {
  if (!(aspect < .8) || !NEAR_EASED.has(tier) || !Number.isFinite(depth)) return 1;
  return 1 - .15 * smoothstep(12, 20, depth) * (1 - smoothstep(35, 55, depth));
}

// Additive halos vanish into bright skies but carry a dark track, where the body blends into the asphalt.
export function pickupHaloLevel(r, g, b) {
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  return Number.isFinite(luminance) ? 1 + .6 * (1 - Math.min(1, Math.max(0, luminance))) : 1;
}

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
