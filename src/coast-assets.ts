// Task 5 runtime assets for Coast on Medium+: the close-scenery GLB (Poly Haven scans). Low and every other track
// never fetch anything. A model that lands mid-race waits until the race stops: attaching adds new materials, and the
// world's warmupShaders pass must build their programs before GO (performance-review.md).
import type { Object3D } from 'three';
import type { ModelCache, ModelHandle } from './asset-model-loader.ts';
import type { VfxQuality } from './vfx-settings.ts';
import { createKtx2Provider } from './garage-model.ts';

interface Scenery { attachModel(source: Object3D): void; detachModel(): void }
interface Deps {
  scenery: Scenery; cache: Pick<ModelCache, 'load'>;
  /** QA state target (the canvas dataset): coastScenery = loading | waiting-for-race-end | attached | fallback:<reason> | off. */
  dataset?: Record<string, string | undefined>;
}

export function createCoastAssets({ scenery, cache, dataset = {} }: Deps) {
  const controller = new AbortController();
  let requested = false, attached = false, handle: ModelHandle | null = null;
  return {
    /** Per frame; true when new materials joined the scene and the caller must run its shader warmup. */
    update(trackId: string, quality: VfxQuality, racing: boolean): boolean {
      if (!requested && trackId === 'coast' && quality !== 'low') {
        requested = true;
        dataset.coastScenery = 'loading';
        cache.load('coast-scenery', { signal: controller.signal }).then(result => {
          if (result.kind === 'model') { handle = result; return; }
          dataset.coastScenery = `fallback:${result.reason}`;
          console.warn(`[coast-assets] coast-scenery → ${result.fallback} (${result.reason})`);
        }, () => {}); // AbortError after dispose
      }
      if (!handle || attached) return false;
      if (racing) { dataset.coastScenery = 'waiting-for-race-end'; return false; }
      scenery.attachModel(handle.instance());
      attached = true;
      dataset.coastScenery = 'attached';
      return true;
    },
    dispose(): void {
      controller.abort();
      if (attached) scenery.detachModel();
      handle?.release();
      handle = null;
      dataset.coastScenery = 'off';
    },
  };
}

/** World wiring: one model cache and KTX2 transcoder for the Coast assets, imported only when first needed. */
export function createWorldCoastAssets(renderer: unknown, scenery: Scenery, dataset: Deps['dataset'], baseUrl = import.meta.env.BASE_URL) {
  const loadKtx2 = createKtx2Provider(renderer, baseUrl);
  // shortcut: `?model=` Garage QA builds its own cache and KTX2 loader; share one if both ever ship by default.
  const real = import('./asset-model-loader.ts').then(({ createModelCache }) => createModelCache({ baseUrl, loadKtx2 }));
  return createCoastAssets({ scenery, dataset, cache: { load: async (id, options) => (await real).load(id, options) } });
}
