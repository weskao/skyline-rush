import { GARAGE_SKINS, SKIN_CATEGORIES } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { LAUNCH_FLARE_STYLES } from './garage-launch-flare-styles.ts';

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
  'nitro-trail': [NEUTRAL, [0.36, 1.4, 1.24], [2, 0.9, 0.22], [2, 0.25, 0.2], [1.16, 0.44, 1.66]], // gold/crimson read true after the (.5, .8, 1) trail base
} as const satisfies Record<Exclude<SkinCategory, 'launch-flare'>, readonly (readonly [number, number, number])[]>;
export function skinVfxPalette(ids: Partial<Record<SkinCategory, SkinId>>): SkinVfxPalette {
  const pattern = skinVfxPattern(ids);
  return {
    thruster: colors.thruster[pattern.thruster] ?? NEUTRAL,
    airflow: colors.airflow[pattern.airflow] ?? NEUTRAL,
    'nitro-trail': colors['nitro-trail'][pattern['nitro-trail']] ?? NEUTRAL,
    'launch-flare': (ids['launch-flare'] && LAUNCH_FLARE_STYLES[ids['launch-flare']]?.primary) || NEUTRAL,
  };
}
