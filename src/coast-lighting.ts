import type { VfxQuality } from './vfx-settings.ts';

/** PMREM cube size; equals RoomEnvironment's, so swapping `scene.environment` never recompiles a lit shader. */
export const PMREM_CUBE_SIZE = 256;

export type CoastEnvName = 'day' | 'dusk' | 'rain' | 'fog';
export interface CoastEnvVariant {
  /** CC0 Poly Haven sky-only 1K HDRI under public/environments. */
  readonly file: string;
  readonly credit: { readonly license: 'CC0-1.0'; readonly creator: string; readonly sourceUrl: string };
  readonly intensity: number;
  readonly exposure: number;
  /** Uniform targets for the lens pass; uniform changes never recompile. */
  readonly grade: { readonly saturation: number; readonly contrast: number; readonly tint: readonly [number, number, number] };
}

const cc0 = (asset: string, creator: string) => ({ license: 'CC0-1.0', creator, sourceUrl: `https://polyhaven.com/a/${asset}` }) as const;

export const COAST_ENV_VARIANTS: Readonly<Record<CoastEnvName, CoastEnvVariant>> = Object.freeze({
  day: { file: 'kloofendal_48d_partly_cloudy_puresky_1k.hdr', credit: cc0('kloofendal_48d_partly_cloudy_puresky', 'Greg Zaal, Jarod Guest'),
    intensity: 0.9, exposure: 1.07, grade: { saturation: 1.08, contrast: 1.05, tint: [1, 0.99, 0.96] } },
  dusk: { file: 'qwantani_sunset_puresky_1k.hdr', credit: cc0('qwantani_sunset_puresky', 'Greg Zaal, Jarod Guest'),
    intensity: 0.8, exposure: 1.1, grade: { saturation: 1.12, contrast: 1.08, tint: [1.04, 0.98, 0.93] } },
  rain: { file: 'belfast_sunset_puresky_1k.hdr', credit: cc0('belfast_sunset_puresky', 'Dimitrios Savva, Greg Zaal, Jarod Guest'),
    intensity: 0.85, exposure: 1.04, grade: { saturation: 1.05, contrast: 1.1, tint: [1.02, 0.98, 0.97] } },
  fog: { file: 'kloofendal_overcast_puresky_1k.hdr', credit: cc0('kloofendal_overcast_puresky', 'Greg Zaal'),
    intensity: 0.75, exposure: 1.0, grade: { saturation: 0.9, contrast: 1.0, tint: [0.97, 0.99, 1.01] } },
});

const PRESET_TO_ENV: Readonly<Record<string, CoastEnvName | undefined>> = { track: 'day', day: 'day', dusk: 'dusk', rain: 'rain', fog: 'fog' };

/** Env variant for a race visual preset; null (night, snow, aurora) leaves the current environment alone. */
export function coastEnvVariant(preset: string): CoastEnvName | null {
  return PRESET_TO_ENV[preset] ?? null;
}

export type CoastEnvPlan = { kind: 'room' } | { kind: 'hdri'; variant: CoastEnvName };

/** Low and every non-Coast track keep RoomEnvironment (the current path); Medium+ Coast loads the HDRI. */
export function coastEnvPlan(trackId: string, preset: string, quality: VfxQuality): CoastEnvPlan {
  const variant = trackId === 'coast' && quality !== 'low' ? coastEnvVariant(preset) : null;
  return variant ? { kind: 'hdri', variant } : { kind: 'room' };
}
