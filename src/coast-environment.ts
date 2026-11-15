import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { DataUtils, EquirectangularReflectionMapping, PMREMGenerator, Scene, type Texture, type WebGLRenderer, type WebGLRenderTarget } from 'three';
import { CAR_REFLECTION, createCarEnvironment } from './car-reflections.ts';
import { COAST_ENV_VARIANTS, type CoastEnvName } from './coast-lighting.ts';
import { coastSkyYaw } from './coast-sky.ts';

/** Scales every RGBA half-float texel brighter than `cap` down to it, hue kept. Positive half floats order as their
 *  bits do, so the scan is an integer compare and only the few texels of the sun are converted. */
export function capRadiance(data: Uint16Array, cap: number): void {
  const limit = DataUtils.toHalfFloat(cap);
  for (let i = 0; i < data.length; i += 4) {
    const top = Math.max(data[i]!, data[i + 1]!, data[i + 2]!);
    if (top <= limit) continue;
    const scale = cap / DataUtils.fromHalfFloat(top);
    for (let c = i; c < i + 3; c++) data[c] = DataUtils.toHalfFloat(DataUtils.fromHalfFloat(data[c]!) * scale);
  }
}

/** A `carSky` variant as the cars' reflection: the capped sky turned as the environment is, prefiltered exactly as
 *  the studio room is (car-reflections.ts) and scaled so the cars' envMapIntensity gives the environment's intensity. */
function carSky(generator: PMREMGenerator, equirect: Texture, name: CoastEnvName): WebGLRenderTarget {
  const scene = new Scene();
  scene.background = equirect; scene.backgroundRotation.y = coastSkyYaw(name);
  scene.backgroundIntensity = COAST_ENV_VARIANTS[name].intensity / CAR_REFLECTION.intensity;
  return generator.fromScene(scene, CAR_REFLECTION.blur, 0.1, 100, { size: CAR_REFLECTION.size });
}

/**
 * Prefiltered Coast sky environments. Load them before GO (`preload`); `get` is then a synchronous map read, so the
 * per-frame/track-change path never decodes or compiles anything. A 1K equirect prefilters to a 256 cube, the size
 * RoomEnvironment uses, so swapping `scene.environment` keeps every lit shader's program.
 */
export function createCoastEnvironments(renderer: WebGLRenderer, baseUrl: string, cars?: Texture) {
  const ready = new Map<CoastEnvName, Texture>(), skies = new Map<CoastEnvName, WebGLRenderTarget>();
  let studio: Texture | null = null, painted: CoastEnvName | null = null; // the room as made, to copy back
  const pending = new Map<CoastEnvName, Promise<Texture | null>>();
  let generator: PMREMGenerator | null = null;
  const load = (name: CoastEnvName): Promise<Texture | null> => {
    const cached = pending.get(name);
    if (cached) return cached;
    const task = new HDRLoader().loadAsync(`${baseUrl}environments/${COAST_ENV_VARIANTS[name].file}`).then(equirect => {
      equirect.mapping = EquirectangularReflectionMapping;
      const cap = COAST_ENV_VARIANTS[name].radianceCap;
      if (cap) capRadiance(equirect.image.data as Uint16Array, cap); // HDRLoader's default type is half float
      generator ??= new PMREMGenerator(renderer);
      const target = generator.fromEquirectangular(equirect);
      if (cars && COAST_ENV_VARIANTS[name].carSky) skies.set(name, carSky(generator, equirect, name));
      equirect.dispose();
      ready.set(name, target.texture);
      return target.texture;
    }, () => null); // load failure = keep the current (RoomEnvironment) path
    pending.set(name, task);
    return task;
  };
  return {
    get: (name: CoastEnvName): Texture | undefined => ready.get(name),
    preload: (names: readonly CoastEnvName[]): Promise<unknown> => Promise.all(names.map(load)),
    /** A GPU copy into the map the cars already hold (same size and format), so no car program recompiles. */
    paintCars(name: CoastEnvName | null): void {
      const sky = name && skies.get(name);
      if (!cars || name === painted || (name && !sky)) return;
      studio ??= createCarEnvironment(renderer);
      renderer.copyTextureToTexture(sky ? sky.texture : studio, cars);
      painted = name;
    },
    dispose() {
      generator?.dispose(); generator = null; for (const texture of ready.values()) texture.dispose(); ready.clear(); pending.clear();
      for (const target of skies.values()) target.dispose(); skies.clear(); studio?.dispose(); studio = null;
    },
  };
}
