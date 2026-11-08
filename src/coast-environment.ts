import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EquirectangularReflectionMapping, PMREMGenerator, type Texture, type WebGLRenderer } from 'three';
import { COAST_ENV_VARIANTS, type CoastEnvName } from './coast-lighting.ts';

/**
 * Prefiltered Coast sky environments. Load them before GO (`preload`); `get` is then a synchronous map read, so the
 * per-frame/track-change path never decodes or compiles anything. A 1K equirect prefilters to a 256 cube, the size
 * RoomEnvironment uses, so swapping `scene.environment` keeps every lit shader's program.
 */
export function createCoastEnvironments(renderer: WebGLRenderer, baseUrl: string) {
  const ready = new Map<CoastEnvName, Texture>();
  const pending = new Map<CoastEnvName, Promise<Texture | null>>();
  let generator: PMREMGenerator | null = null;
  const load = (name: CoastEnvName): Promise<Texture | null> => {
    const cached = pending.get(name);
    if (cached) return cached;
    const task = new HDRLoader().loadAsync(`${baseUrl}environments/${COAST_ENV_VARIANTS[name].file}`).then(equirect => {
      equirect.mapping = EquirectangularReflectionMapping;
      generator ??= new PMREMGenerator(renderer);
      const target = generator.fromEquirectangular(equirect);
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
    dispose() { generator?.dispose(); generator = null; for (const texture of ready.values()) texture.dispose(); ready.clear(); pending.clear(); },
  };
}
