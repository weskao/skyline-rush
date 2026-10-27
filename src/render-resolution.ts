import type { VfxQuality } from './vfx-settings.ts';

export function renderPixelRatioForQuality(quality: VfxQuality, pixelRatio: number, scale: number): number {
  const maxRatio = quality === 'low' ? 1 : quality === 'medium' ? 1.25 : 1.5;
  const adaptiveScale = Number.isFinite(scale) ? Math.max(0.75, Math.min(1, scale)) : 1;
  return Math.min(pixelRatio, maxRatio) * adaptiveScale;
}
