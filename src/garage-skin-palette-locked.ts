import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';

// Neutral production Strategy; no unreleased palette, cosmetic skin IDs or entitlement logic.
export function skinVfxPalette(_ids: Partial<Record<SkinCategory, SkinId>>): Record<SkinCategory, readonly [number, number, number]> {
  const neutral = [1, 1, 1] as const;
  return { thruster: neutral, airflow: neutral, 'nitro-trail': neutral, 'launch-flare': neutral };
}
