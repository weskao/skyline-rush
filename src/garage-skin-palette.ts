import { GARAGE_SKINS, SKIN_CATEGORIES } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';

/** Pattern identity: shader geometry/timing varies independently of tint. */
export type SkinVfxPattern = Record<SkinCategory, number>;
export function skinVfxPattern(ids: Partial<Record<SkinCategory, SkinId>>): SkinVfxPattern {
  return Object.fromEntries(SKIN_CATEGORIES.map(category => {
    const variants = GARAGE_SKINS.filter(skin => skin.category === category);
    const index = variants.findIndex(skin => skin.id === ids[category]);
    return [category, Math.max(0, index)];
  })) as SkinVfxPattern;
}

export type SkinVfxPalette = Record<SkinCategory, readonly [number, number, number]>;
const NEUTRAL = [1, 1, 1] as const;
const colors = {
  thruster: [NEUTRAL, [0.38, 1.1, 1.8], [1.6, 0.82, 0.38], [0.72, 0.52, 1.6]],
  airflow: [NEUTRAL, [0.56, 1.35, 1.2], [0.6, 0.85, 1.8], [1.3, 0.75, 1.6]],
  'nitro-trail': [NEUTRAL, [0.36, 1.4, 1.24], [1.7, 1.2, 0.36], [1.65, 0.35, 0.48]],
  'launch-flare': [NEUTRAL, [0.35, 0.75, 1.65], [1.25, 0.95, 1.6], [1.6, 0.5, 1.1]],
} as const satisfies Record<SkinCategory, readonly (readonly [number, number, number])[]>;
export function skinVfxPalette(ids: Partial<Record<SkinCategory, SkinId>>): SkinVfxPalette {
  const pattern = skinVfxPattern(ids);
  return {
    thruster: colors.thruster[pattern.thruster] ?? NEUTRAL,
    airflow: colors.airflow[pattern.airflow] ?? NEUTRAL,
    'nitro-trail': colors['nitro-trail'][pattern['nitro-trail']] ?? NEUTRAL,
    'launch-flare': colors['launch-flare'][pattern['launch-flare']] ?? NEUTRAL,
  };
}
