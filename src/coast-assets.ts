// Task 5 runtime assets for Coast on Medium+: the close-scenery GLB (Poly Haven scans), the boats on the open water
// (coast-boats.ts), the KTX2 asphalt road, the HDRI sky dome (coast-sky.ts) and the water that mirrors it (coast-sea.ts).
// Low and every other track never fetch anything. New materials join the scene only outside 'racing': the world's
// warmupShaders pass must build their programs before GO (performance-review.md). Weather is a uniform, never a swap.
import type { BufferGeometry, Camera, Material, Matrix4, Mesh, Object3D, Scene, Texture, Vector3 } from 'three';
import type { ShoreSink } from './coast-scenery-glb.ts';
import { createCoastSea } from './coast-sea.ts';
import { createCoastSky } from './coast-sky.ts';
import type { ModelCache, ModelHandle } from './asset-model-loader.ts';
import { TIERS, type MaterialFile, type MaterialTier } from './material-manifest.ts';
import { modelUrl } from './model-manifest.ts';
import type { VfxQuality } from './vfx-settings.ts';
import { createKtx2Provider } from './garage-model.ts';
import { coastRoadFiles, coastRoadTier, coastWetness, createCoastRoadMaterial, type CoastRoad, type ReflectionUniforms } from './coast-road-material.ts';
import { createWetReflection, wetReflectionStrength } from './wet-reflection.ts';
import { look3d } from './look-gate.ts';
import { withGreenery } from './coast-greenery.ts';
import { trackLook, type TrackLook } from './track-look.ts';
import type { ClassicRoad } from './classic-road-routes.ts';
import { createNeonScenery, type NeonScenery } from './neon-scenery.ts';

interface Clock { value: number }
interface Scenery {
  attachModel(source: Object3D, shore?: ShoreSink): void; detachModel(): void;
  attachBoats(source: Object3D, clock: Clock): void; detachBoats(): void;
}
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
type Sky = Pick<ReturnType<typeof createCoastSky>, 'update' | 'dispose'>;
type Sea = Pick<ReturnType<typeof createCoastSea>, 'update' | 'dispose' | 'shore'>;
interface Deps {
  scenery: Scenery; cache: Pick<ModelCache, 'load'>;
  /** Seconds, as the sea shader counts them (0 under reduced motion): with it the boats GLB loads and sails. */
  boatClock?: Clock;
  road?: Road; reflection?: Reflection; sky?: Sky; sea?: Sea;
  /** The procedural far cones (classic-backdrop.ts): off on Coast while the scan coast, which has its own far
   *  headlands (coast-scenery-glb.ts), is drawn. */
  mountains?: { material: { visible: boolean } };
  /** D1, D2: the skyline buildings and the bridge towers (world.js) leave Coast with the cones; the sea arch is the
   *  landmark. Low keeps them (owner decision 2026-11-14), as do other tracks and a failed load. */
  city?: { visible: boolean }; towers?: Object3D[];
  /** Task 5b: the layer that draws the two Neon Downtown kits, and the procedural parts (box roadside, lamp posts,
   *  piers, tunnel shell) it replaces while both kits are in the scene. */
  neon?: Pick<NeonScenery, 'attachKit' | 'detachKit' | 'update' | 'hide' | 'dispose'>; replaced?: Object3D[];
  /** QA state (the canvas dataset): coastScenery, coastBoats, neonCity, neonLandmarks = loading |
   *  waiting-for-race-end | attached | fallback:<reason> | off;
   *  coastRoad = medium | high | ultra (material tier) while the asphalt is on the road, else procedural | fallback. */
  dataset?: Record<string, string | undefined>;
}

export function createCoastAssets({ scenery, cache, boatClock, road, reflection, sky, sea, mountains, city, towers, neon, replaced, dataset = {} }: Deps) {
  const controller = new AbortController();
  const procedural = road?.mesh.material;
  const roads = new Map<string, CoastRoad | 'loading' | 'failed'>(); // by road set and tier
  let mirrored = false, wasRacing = false, retag = false; // the mirror re-tags light sources on turn-on and race start
  let bare = false, dressed = false; // a scan coast or the Neon kits are drawn: no cones, city or towers; kits: no box roadside
  // world.js writes .visible on these every frame, so they are hidden through their own materials.
  const show = (objects: Object3D[] | undefined, on: boolean) => objects?.forEach(object => object.traverse(part => {
    const { material } = part as Mesh<BufferGeometry, Material>;
    if (material) material.visible = on;
  }));
  const onBeforeRender = road?.mesh.onBeforeRender;
  if (road && reflection) road.mesh.onBeforeRender = (renderer, scene, camera) => {
    if (retag) { reflection.tag(scene); retag = false; }
    reflection.render(renderer, scene, camera, road.mesh.matrixWorld?.elements[13] ?? 0);
  };

  /** One GLB a track's look entry names under `slot`: fetched once on Medium+, in the scene only from outside a race on. */
  function lateModel(id: string, slot: 'scenery' | 'boats' | 'landmarks', status: string, attach: (source: Object3D) => void, detach: () => void) {
    let requested = false, handle: ModelHandle | null = null;
    const part = {
      attached: false,
      wanted: (look: TrackLook | undefined, quality: VfxQuality): boolean => look?.[slot] === id && quality !== 'low',
      /** True when the model just joined the scene: its programs need the warmup. */
      update(look: TrackLook | undefined, quality: VfxQuality, racing: boolean): boolean {
        if (!requested && part.wanted(look, quality)) {
          requested = true;
          dataset[status] = 'loading';
          cache.load(id, { signal: controller.signal }).then(result => {
            if (result.kind === 'model') { handle = result; return; }
            dataset[status] = `fallback:${result.reason}`;
            console.warn(`[coast-assets] ${id} → ${result.fallback} (${result.reason})`);
          }, () => {}); // AbortError after dispose
        }
        if (!handle || part.attached) return false;
        if (racing) { dataset[status] = 'waiting-for-race-end'; return false; }
        attach(handle.instance());
        part.attached = true;
        dataset[status] = 'attached';
        return true;
      },
      /** Leaves the scene before the cache frees the GLB resources. */
      dispose(): void {
        if (part.attached) detach();
        handle?.release();
        handle = null;
        dataset[status] = 'off';
      },
    };
    return part;
  }
  const scan = lateModel('coast-scenery', 'scenery', 'coastScenery', source => scenery.attachModel(source, sea?.shore), () => scenery.detachModel());
  const boats = boatClock && lateModel('coast-boats', 'boats', 'coastBoats', source => scenery.attachBoats(source, boatClock), () => scenery.detachBoats());
  const cityKit = neon && lateModel('neon-city', 'scenery', 'neonCity', source => neon.attachKit('city', source), () => neon.detachKit('city'));
  const landmarks = neon && lateModel('neon-landmarks', 'landmarks', 'neonLandmarks', source => neon.attachKit('landmarks', source), () => neon.detachKit('landmarks'));

  function loadRoad(id: string, tier: MaterialTier, key: string, { load, anisotropy }: Road): void {
    roads.set(key, 'loading');
    const files = coastRoadFiles(TIERS[tier], id);
    Promise.all([files.baseColor, files.normal, files.packed].map(load)).then(([baseColor, normal, packed]) => {
      const made = createCoastRoadMaterial({ baseColor: baseColor!, normal: normal!, packed: packed! }, anisotropy, { detail: tier === 'ultra', ...reflection && { reflection: reflection.uniforms } });
      if (controller.signal.aborted) made.dispose(); else roads.set(key, made);
    }, error => {
      roads.set(key, 'failed');
      dataset.coastRoad = 'fallback';
      dataset.coastRoadSet = 'none';
      console.warn(`[coast-assets] ${id} ${tier} → procedural road (${error})`);
    });
  }

  function updateRoad(look: TrackLook | undefined, quality: VfxQuality, racing: boolean, preset: string, ultra: boolean): boolean {
    if (!road) return false;
    const tier = look ? coastRoadTier(quality, ultra) : null, key = `${look?.road}:${tier}`;
    if (tier && !roads.has(key)) loadRoad(look!.road, tier, key, road);
    const ready = tier ? roads.get(key) : undefined;
    const want = typeof ready === 'object' ? ready : null;
    want?.setWetness(coastWetness(preset, look!.wetness));
    const target = want?.material ?? procedural!, swap = road.mesh.material !== target && !racing;
    if (swap) {
      road.mesh.material = target;
      dataset.coastRoad = want ? tier! : 'procedural';
      dataset.coastRoadSet = want ? look!.road : 'none';
      for (const [other, entry] of roads) if (other !== key && typeof entry === 'object') { entry.dispose(); roads.delete(other); } // frees the set or tier left behind
    }
    updateMirror(!!want && road.mesh.material === want.material, quality, preset, racing, look?.wetness);
    return swap && !!want;
  }

  /** Mirror only while the KTX2 asphalt that samples it is on the road; never while a swap waits for the race end. */
  function updateMirror(onRoad: boolean, quality: VfxQuality, preset: string, racing: boolean, wetness?: TrackLook['wetness']): void {
    const strength = onRoad ? wetReflectionStrength(quality, preset, wetness) : 0;
    reflection?.setStrength(strength);
    if (strength > 0 && (!mirrored || (racing && !wasRacing))) retag = true;
    mirrored = strength > 0; wasRacing = racing;
  }

  return {
    /** Per frame; true when new materials joined the scene and the caller must run its shader warmup. */
    update(trackId: string, quality: VfxQuality, racing: boolean, preset = 'track', ultra = false, route?: ClassicRoad, distance = 0, seed?: number): boolean {
      const look = trackLook(trackId), onScan = scan.wanted(look, 'high'); // this track's look draws the scan coast
      const onKit = !!cityKit?.wanted(look, 'high'); // this track's look draws the Neon kits
      const joined = scan.update(look, quality, racing), sailing = boats?.update(look, quality, racing) ?? false;
      const built = cityKit?.update(look, quality, racing) ?? false, marked = landmarks?.update(look, quality, racing) ?? false;
      // All or nothing: half a kit never replaces the procedural city. `route` is the authored loop (not practice).
      const kitted = onKit && quality !== 'low' && !!route && cityKit!.attached && landmarks!.attached;
      const drawn = scan.attached && onScan && quality !== 'low' || kitted;
      if (mountains) mountains.material.visible = !drawn;
      if (city && (onScan || onKit)) city.visible = !drawn; // world.js sets it on a track change only
      if (drawn !== bare) show(towers, !(bare = drawn));
      if (kitted !== dressed) show(replaced, !(dressed = kitted));
      if (kitted) neon!.update(route!, distance, quality, seed); else neon?.hide();
      sky?.update(trackId, preset, quality, ultra); // its program exists from creation: nothing to warm up
      sea?.update(trackId, preset, quality); // after the sky: the water shows only under the dome it mirrors
      return updateRoad(look, quality, racing, preset, ultra) || joined || sailing || built || marked;
    },
    dispose(): void {
      controller.abort();
      boats?.dispose(); scan.dispose(); landmarks?.dispose(); cityKit?.dispose(); neon?.dispose();
      if (mountains) mountains.material.visible = true;
      if (bare) { city && (city.visible = true); show(towers, true); }
      if (dressed) show(replaced, true);
      if (road) { road.mesh.material = procedural!; road.mesh.onBeforeRender = onBeforeRender; }
      reflection?.dispose(); sea?.dispose(); sky?.dispose();
      for (const entry of roads.values()) if (typeof entry === 'object') entry.dispose();
      roads.clear();
    },
  };
}

interface Ktx2TextureLoader { loadAsync(url: string): Promise<Texture> }
interface WorldRenderer { capabilities: { getMaxAnisotropy(): number; maxTextureSize: number } }

/** World wiring: one model cache and KTX2 transcoder for the Coast assets, imported only when first needed.
 *  null without `?look=3d` (look-gate.ts): no loader, mirror hook or fetch, the develop road and scenery. */
export function createWorldCoastAssets(renderer: WorldRenderer,
  targets: { scene: Object3D; scenery: Scenery & { group: { position: Vector3 } }; road: Road['mesh'] } & Pick<Parameters<typeof createCoastSky>[0], 'sky' | 'sun'> & Pick<Parameters<typeof createCoastSea>[0], 'sea' | 'seaLines'> & Pick<Deps, 'mountains' | 'city' | 'towers' | 'replaced'>,
  dataset: Deps['dataset'], baseUrl = import.meta.env.BASE_URL) {
  if (!look3d()) return null;
  const loadKtx2 = createKtx2Provider(renderer, baseUrl);
  // shortcut: `?model=` Garage QA builds its own cache and KTX2 loader; share one if both ever ship by default.
  const real = import('./asset-model-loader.ts').then(({ createModelCache }) => createModelCache({ baseUrl, loadKtx2 }));
  const loadTexture = async (url: string) => ((await loadKtx2()) as unknown as Ktx2TextureLoader).loadAsync(modelUrl(url, baseUrl));
  const road: Road = {
    mesh: targets.road,
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()), // grazing-angle asphalt; Medium+ only
    load: file => loadTexture(file.url),
  };
  const sky = createCoastSky({ sky: targets.sky, sun: targets.sun, load: loadTexture, maxTextureSize: renderer.capabilities.maxTextureSize, dataset });
  const sea = createCoastSea({ sea: targets.sea, seaLines: targets.seaLines, dome: sky.dome, origin: targets.scenery.group.position, load: loadTexture, dataset });
  return createCoastAssets({ scenery: targets.scenery, boatClock: targets.sea.material.uniforms.time!, road, sky, sea, mountains: targets.mountains, city: targets.city, towers: targets.towers, neon: createNeonScenery(targets.scene), replaced: targets.replaced, dataset, reflection: createWetReflection(), cache: withGreenery({ load: async (id, options) => (await real).load(id, options) }) });
}
