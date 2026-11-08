// Task 5 runtime assets for Coast on Medium+: the close-scenery GLB (Poly Haven scans) and the KTX2 asphalt road.
// Low and every other track never fetch anything. New materials join the scene only outside 'racing': the world's
// warmupShaders pass must build their programs before GO (performance-review.md). Weather is a uniform, never a swap.
import type { Material, Object3D, Texture } from 'three';
import type { ModelCache, ModelHandle } from './asset-model-loader.ts';
import type { MaterialFile } from './material-manifest.ts';
import { modelUrl } from './model-manifest.ts';
import type { VfxQuality } from './vfx-settings.ts';
import { createKtx2Provider } from './garage-model.ts';
import { coastRoadFiles, coastRoadTier, coastWetness, createCoastRoadMaterial, type CoastRoad } from './coast-road-material.ts';

interface Scenery { attachModel(source: Object3D): void; detachModel(): void }
interface Road { mesh: { material: Material | Material[] }; load(file: MaterialFile): Promise<Texture>; anisotropy?: number }
interface Deps {
  scenery: Scenery; cache: Pick<ModelCache, 'load'>; road?: Road;
  /** QA state (the canvas dataset): coastScenery = loading | waiting-for-race-end | attached | fallback:<reason> | off;
   *  coastRoad = <resolution> while the asphalt is on the road, else procedural | fallback. */
  dataset?: Record<string, string | undefined>;
}

export function createCoastAssets({ scenery, cache, road, dataset = {} }: Deps) {
  const controller = new AbortController();
  const procedural = road?.mesh.material;
  const roads = new Map<number, CoastRoad | 'loading' | 'failed'>();
  let requested = false, attached = false, handle: ModelHandle | null = null;

  function updateScenery(trackId: string, quality: VfxQuality, racing: boolean): boolean {
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
  }

  function loadRoad(tier: number, { load, anisotropy }: Road): void {
    roads.set(tier, 'loading');
    const files = coastRoadFiles(tier);
    Promise.all([files.baseColor, files.normal, files.packed].map(load)).then(([baseColor, normal, packed]) => {
      const made = createCoastRoadMaterial({ baseColor: baseColor!, normal: normal!, packed: packed! }, anisotropy);
      if (controller.signal.aborted) made.dispose(); else roads.set(tier, made);
    }, error => {
      roads.set(tier, 'failed');
      dataset.coastRoad = 'fallback';
      console.warn(`[coast-assets] coast-asphalt ${tier} → procedural road (${error})`);
    });
  }

  function updateRoad(trackId: string, quality: VfxQuality, racing: boolean, preset: string, ultra: boolean): boolean {
    if (!road) return false;
    const tier = trackId === 'coast' ? coastRoadTier(quality, ultra) : null;
    if (tier && !roads.has(tier)) loadRoad(tier, road);
    const ready = tier ? roads.get(tier) : undefined;
    const want = typeof ready === 'object' ? ready : null;
    want?.setWetness(coastWetness(preset));
    const target = want?.material ?? procedural!;
    if (road.mesh.material === target || racing) return false;
    road.mesh.material = target;
    dataset.coastRoad = want ? String(tier) : 'procedural';
    for (const [other, entry] of roads) if (other !== tier && typeof entry === 'object') { entry.dispose(); roads.delete(other); } // frees the 2K set after leaving Ultra
    return !!want;
  }

  return {
    /** Per frame; true when new materials joined the scene and the caller must run its shader warmup. */
    update(trackId: string, quality: VfxQuality, racing: boolean, preset = 'track', ultra = false): boolean {
      const scenery = updateScenery(trackId, quality, racing);
      return updateRoad(trackId, quality, racing, preset, ultra) || scenery;
    },
    dispose(): void {
      controller.abort();
      if (attached) scenery.detachModel();
      handle?.release();
      handle = null;
      if (road) road.mesh.material = procedural!;
      for (const entry of roads.values()) if (typeof entry === 'object') entry.dispose();
      roads.clear();
      dataset.coastScenery = 'off';
    },
  };
}

interface Ktx2TextureLoader { loadAsync(url: string): Promise<Texture> }
interface WorldRenderer { capabilities: { getMaxAnisotropy(): number } }

/** World wiring: one model cache and KTX2 transcoder for the Coast assets, imported only when first needed. */
export function createWorldCoastAssets(renderer: WorldRenderer, targets: { scenery: Scenery; road: Road['mesh'] },
  dataset: Deps['dataset'], baseUrl = import.meta.env.BASE_URL) {
  const loadKtx2 = createKtx2Provider(renderer, baseUrl);
  // shortcut: `?model=` Garage QA builds its own cache and KTX2 loader; share one if both ever ship by default.
  const real = import('./asset-model-loader.ts').then(({ createModelCache }) => createModelCache({ baseUrl, loadKtx2 }));
  const road: Road = {
    mesh: targets.road,
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()), // grazing-angle asphalt; Medium+ only
    load: async file => ((await loadKtx2()) as unknown as Ktx2TextureLoader).loadAsync(modelUrl(file.url, baseUrl)),
  };
  return createCoastAssets({ scenery: targets.scenery, road, dataset, cache: { load: async (id, options) => (await real).load(id, options) } });
}
