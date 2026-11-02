import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';

// Neutral production Strategy; no unreleased palette, cosmetic skin IDs or entitlement logic.
export function skinVfxPalette(_ids: Partial<Record<SkinCategory, SkinId>>): Record<SkinCategory, readonly [number, number, number]> {
  const neutral = [1, 1, 1] as const;
  return { thruster: neutral, airflow: neutral, 'nitro-trail': neutral, 'launch-flare': neutral };
}

// Locked production must supply the shader ABI without exposing any Skin IDs.
export function skinVfxPattern(_ids: Partial<Record<SkinCategory, SkinId>>): Record<SkinCategory, number> {
  return { thruster: 0, airflow: 0, 'nitro-trail': 0, 'launch-flare': 0 };
}
