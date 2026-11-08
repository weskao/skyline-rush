// Task 5 runtime assets for Coast on Medium+: the close-scenery GLB (Poly Haven scans) and the KTX2 asphalt road.
// Low and every other track never fetch anything. New materials join the scene only outside 'racing': the world's
// warmupShaders pass must build their programs before GO (performance-review.md). Weather is a uniform, never a swap.
import type { Camera, Material, Matrix4, Object3D, Scene, Texture } from 'three';
import type { ModelCache, ModelHandle } from './asset-model-loader.ts';
import { TIERS, type MaterialFile, type MaterialTier } from './material-manifest.ts';
import { modelUrl } from './model-manifest.ts';
import type { VfxQuality } from './vfx-settings.ts';
import { createKtx2Provider } from './garage-model.ts';
import { coastRoadFiles, coastRoadTier, coastWetness, createCoastRoadMaterial, type CoastRoad, type ReflectionUniforms } from './coast-road-material.ts';
import { createWetReflection, wetReflectionStrength } from './wet-reflection.ts';

interface Scenery { attachModel(source: Object3D): void; detachModel(): void }
type BeforeRender = (renderer: never, scene: Scene, camera: Camera) => void;
interface Road {
  mesh: { material: Material | Material[]; matrixWorld?: Matrix4; onBeforeRender?: BeforeRender };
  load(file: MaterialFile): Promise<Texture>; anisotropy?: number;
}
/** The lights-only wet mirror (wet-reflection.ts), injectable for tests. */
interface Reflection {
  uniforms: ReflectionUniforms; setStrength(value: number): void; tag(scene: Object3D): void;
  render(renderer: never, scene: Scene, camera: Camera, height: number): void; dispose(): void;
}
interface Deps {
  scenery: Scenery; cache: Pick<ModelCache, 'load'>; road?: Road; reflection?: Reflection;
  /** QA state (the canvas dataset): coastScenery = loading | waiting-for-race-end | attached | fallback:<reason> | off;
   *  coastRoad = medium | high | ultra (material tier) while the asphalt is on the road, else procedural | fallback. */
  dataset?: Record<string, string | undefined>;
}

export function createCoastAssets({ scenery, cache, road, reflection, dataset = {} }: Deps) {
  const controller = new AbortController();
  const procedural = road?.mesh.material;
  const roads = new Map<MaterialTier, CoastRoad | 'loading' | 'failed'>();
  let requested = false, attached = false, handle: ModelHandle | null = null;
  let mirrored = false, wasRacing = false, retag = false; // the mirror re-tags light sources on turn-on and race start
  const onBeforeRender = road?.mesh.onBeforeRender;
  if (road && reflection) road.mesh.onBeforeRender = (renderer, scene, camera) => {
    if (retag) { reflection.tag(scene); retag = false; }
    reflection.render(renderer, scene, camera, road.mesh.matrixWorld?.elements[13] ?? 0);
  };

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

  function loadRoad(tier: MaterialTier, { load, anisotropy }: Road): void {
    roads.set(tier, 'loading');
    const files = coastRoadFiles(TIERS[tier]);
    Promise.all([files.baseColor, files.normal, files.packed].map(load)).then(([baseColor, normal, packed]) => {
      const made = createCoastRoadMaterial({ baseColor: baseColor!, normal: normal!, packed: packed! }, anisotropy, { detail: tier === 'ultra', ...reflection && { reflection: reflection.uniforms } });
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
    const target = want?.material ?? procedural!, swap = road.mesh.material !== target && !racing;
    if (swap) {
      road.mesh.material = target;
      dataset.coastRoad = want ? tier! : 'procedural';
      for (const [other, entry] of roads) if (other !== tier && typeof entry === 'object') { entry.dispose(); roads.delete(other); } // frees the tier left behind
    }
    updateMirror(!!want && road.mesh.material === want.material, quality, preset, racing);
    return swap && !!want;
  }

  /** Mirror only while the KTX2 asphalt that samples it is on the road; never while a swap waits for the race end. */
  function updateMirror(onRoad: boolean, quality: VfxQuality, preset: string, racing: boolean): void {
    const strength = onRoad ? wetReflectionStrength(quality, preset) : 0;
    reflection?.setStrength(strength);
    if (strength > 0 && (!mirrored || (racing && !wasRacing))) retag = true;
    mirrored = strength > 0; wasRacing = racing;
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
      if (road) { road.mesh.material = procedural!; road.mesh.onBeforeRender = onBeforeRender; }
      reflection?.dispose();
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
  return createCoastAssets({ scenery: targets.scenery, road, dataset, reflection: createWetReflection(), cache: { load: async (id, options) => (await real).load(id, options) } });
}
