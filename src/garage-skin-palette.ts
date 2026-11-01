import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';

/** Multipliers, not new GPU resources. Defaults are exactly neutral. */
export type SkinVfxPalette = Record<SkinCategory, readonly [number, number, number]>;
const NEUTRAL = [1, 1, 1] as const;
const ION = [0.38, 1.1, 1.8] as const;
const SLIPSTREAM = [0.56, 1.35, 1.2] as const;
const CYAN = [0.36, 1.4, 1.24] as const;
const BLUE = [0.35, 0.75, 1.65] as const;

/** Validate against each category: corrupted or cross-category IDs never reach a shader. */
export function skinVfxPalette(ids: Partial<Record<SkinCategory, SkinId>>): SkinVfxPalette {
  return {
    thruster: ids.thruster === 'thruster-ion' ? ION : NEUTRAL,
    airflow: ids.airflow === 'airflow-slipstream' ? SLIPSTREAM : NEUTRAL,
    'nitro-trail': ids['nitro-trail'] === 'nitro-trail-cyan' ? CYAN : NEUTRAL,
    'launch-flare': ids['launch-flare'] === 'launch-flare-blue' ? BLUE : NEUTRAL,
  };
}
