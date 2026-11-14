import type { VfxQuality } from './vfx-settings.ts';
import { look3d } from './look-gate.ts';
import { trackLook } from './track-look.ts';

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
  /** UnrealBloomPass uniforms: the threshold sits under the HDR light blades (rail, tail, nozzle) and over the sky. */
  readonly bloom: { readonly strength: number; readonly threshold: number };
  /** Cap on the environment map's radiance (coast-environment.ts) for a sun low enough to be mirrored by the wet road
   *  once it is turned ahead of the car: uncapped, the mirrored sun whites out the road. The key light is the sun. */
  readonly radianceCap?: number;
  /** Key light matched to the HDRI's sun. */
  readonly sun: { readonly color: string; readonly intensity: number };
  /** Visible sky dome (coast-sky.ts), from the SUMMARY of assets-src/coast-sky/build.py: the HDRI's own sun direction
   *  (u = atan2(z, x) / 2pi + 0.5), the texture's decode range, and the HDR sun disc's size (0 = no disc in this sky).
   *  `gain` exposes the sky for the screen: it puts the 90th percentile of the sky the chase camera sees (elevation
   *  0 to 40 degrees) at the bloom threshold, so only the glow around the sun blooms. Lighting uses `intensity`. */
  readonly sky: { readonly sunDirection: readonly [number, number, number]; readonly range: number; readonly gain: number; readonly disc: number };
}

const cc0 = (asset: string, creator: string) => ({ license: 'CC0-1.0', creator, sourceUrl: `https://polyhaven.com/a/${asset}` }) as const;

export const COAST_ENV_VARIANTS: Readonly<Record<CoastEnvName, CoastEnvVariant>> = Object.freeze({
  day: { file: 'kloofendal_48d_partly_cloudy_puresky_1k.hdr', credit: cc0('kloofendal_48d_partly_cloudy_puresky', 'Greg Zaal, Jarod Guest'),
    intensity: 0.9, exposure: 0.8, grade: { saturation: 1.3, contrast: 1.12, tint: [1.04, 1, 0.92] },
    bloom: { strength: 0.36, threshold: 1.15 }, sun: { color: '#ffe2b0', intensity: 2.6 },
    sky: { sunDirection: [0.5544, 0.7417, 0.3776], range: 2.5, gain: 0.55, disc: 0.7 } },
  dusk: { file: 'qwantani_sunset_puresky_1k.hdr', credit: cc0('qwantani_sunset_puresky', 'Greg Zaal, Jarod Guest'),
    intensity: 0.8, exposure: 1.1, grade: { saturation: 1.12, contrast: 1.08, tint: [1.04, 0.98, 0.93] },
    bloom: { strength: 0.55, threshold: 0.95 }, radianceCap: 4, sun: { color: '#ffad72', intensity: 2.1 },
    sky: { sunDirection: [0.8042, 0.106, 0.5848], range: 4, gain: 0.28, disc: 1 } },
  rain: { file: 'belfast_sunset_puresky_1k.hdr', credit: cc0('belfast_sunset_puresky', 'Dimitrios Savva, Greg Zaal, Jarod Guest'),
    intensity: 0.85, exposure: 1.04, grade: { saturation: 1.05, contrast: 1.1, tint: [1.02, 0.98, 0.97] },
    bloom: { strength: 0.6, threshold: 0.9 }, radianceCap: 2, sun: { color: '#ffb48a', intensity: 1.2 },
    sky: { sunDirection: [0.8066, 0.0441, 0.5894], range: 6, gain: 0.15, disc: 0 } },
  fog: { file: 'kloofendal_overcast_puresky_1k.hdr', credit: cc0('kloofendal_overcast_puresky', 'Greg Zaal'),
    intensity: 0.75, exposure: 1.0, grade: { saturation: 0.9, contrast: 1.0, tint: [0.97, 0.99, 1.01] },
    bloom: { strength: 0.45, threshold: 1.0 }, sun: { color: '#dfe6ee', intensity: 1.1 },
    sky: { sunDirection: [0.7724, 0.3869, 0.5037], range: 4, gain: 0.34, disc: 0 } },
});

const envVariant = (trackId: string, preset: string): CoastEnvName | null => {
  const env = trackLook(trackId)?.env;
  return env && Object.hasOwn(env, preset) ? env[preset] ?? null : null;
};

/** Coast's env variant for a race visual preset; null (night, snow, aurora) leaves the current environment alone. */
export const coastEnvVariant = (preset: string): CoastEnvName | null => envVariant('coast', preset);

export type CoastEnvPlan = { kind: 'room' } | { kind: 'hdri'; variant: CoastEnvName };

/** Low, every track without a look entry (track-look.ts) and pages without `?look=3d` keep RoomEnvironment (the develop path); Medium+ loads the track's HDRI. */
export function coastEnvPlan(trackId: string, preset: string, quality: VfxQuality): CoastEnvPlan {
  const variant = quality !== 'low' && look3d() ? envVariant(trackId, preset) : null;
  return variant ? { kind: 'hdri', variant } : { kind: 'room' };
}
