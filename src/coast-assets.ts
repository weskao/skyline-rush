// Task 5 runtime assets for Coast on Medium+: the close-scenery GLB (Poly Haven scans), the boats on the open water
// (coast-boats.ts), the KTX2 asphalt road, the HDRI sky dome (coast-sky.ts) and the water that mirrors it (coast-sea.ts).
// Low and tracks without a look entry never fetch track assets. New materials join the scene only outside 'racing': the world's
// warmupShaders pass must build their programs before GO (performance-review.md). Weather is a uniform, never a swap.
import type { BufferGeometry, Camera, Material, Matrix4, Mesh, Object3D, Scene, Texture, Vector3 } from 'three';
import type { ShoreSink } from './coast-scenery-glb.ts';
import { createCoastSea } from './coast-sea.ts';
import { createCoastSky, waitForSceneTexture } from './coast-sky.ts';
import type { ModelCache, ModelHandle } from './asset-model-loader.ts';
import { TIERS, type MaterialFile, type MaterialTier } from './material-manifest.ts';
import { modelUrl } from './model-manifest.ts';
import type { VfxQuality } from './vfx-settings.ts';
import { createKtx2Provider } from './garage-model.ts';
import { coastRoadFiles, coastRoadTier, coastWetness, createCoastRoadMaterial, type CoastRoad, type ReflectionUniforms } from './coast-road-material.ts';
import { createWetReflection, wetReflectionStrength } from './wet-reflection.ts';
import { withGreenery } from './coast-greenery.ts';
import { detailedTrackLook, trackLook, type TrackLook } from './track-look.ts';
import type { ClassicRoad } from './classic-road-routes.ts';
import { createNeonScenery, type NeonScenery } from './neon-scenery.ts';
import { createSpiralLook, type SpiralLook, type SpiralParts } from './spiral-look.ts';

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
type Sky = Pick<ReturnType<typeof createCoastSky>, 'update' | 'dispose' | 'pending'>;
type Sea = Pick<ReturnType<typeof createCoastSea>, 'update' | 'dispose' | 'shore' | 'pending'>;
interface Deps {
  scenery: Scenery; cache: Pick<ModelCache, 'load'>;
  /** Seconds, as the sea shader counts them (0 under reduced motion): with it the boats GLB loads and sails. */
  boatClock?: Clock;
  road?: Road; reflection?: Reflection; sky?: Sky; sea?: Sea;
  /** The procedural far cones (classic-backdrop.ts): off on Coast while the scan coast, which has its own far
   *  headlands (coast-scenery-glb.ts), is drawn. */
  mountains?: { material: { visible: boolean } };
  /** The box lamp posts and arms (world.js): off wherever the scan coast, which has modelled posts under the same
   *  lamp heads, or the Neon kits are drawn. */
  poles?: { material: { visible: boolean } };
  /** D1, D2: the skyline buildings and the bridge towers (world.js) leave Coast with the cones; the sea arch is the
   *  landmark. Low keeps them (owner decision 2026-11-14), as do other tracks and a failed load. */
  city?: { visible: boolean }; towers?: Object3D[];
  /** Task 5b: the layer that draws the two Neon Downtown kits, and the procedural parts (box roadside, lamp posts,
   *  piers, tunnel shell) it replaces while both kits are in the scene. */
  neon?: Pick<NeonScenery, 'attachKit' | 'detachKit' | 'pave' | 'update' | 'hide' | 'dispose'>; replaced?: Object3D[];
  /** Task 8c: the Sky Spiral course's own sky, haze and road ribbon (spiral-look.ts). */
  spiral?: Pick<SpiralLook, 'attachKit' | 'detachKit' | 'pave' | 'update' | 'dispose'>;
  /** QA state (the canvas dataset): coastScenery, coastBoats, neonCity, neonLandmarks, spiralLandmarks = loading |
   *  waiting-for-race-end | attached | fallback:<reason> | off;
   *  coastRoad, neonGround, spiralRoad = medium | high | ultra (material tier) while the set is on that surface,
   *  else procedural | fallback. */
  dataset?: Record<string, string | undefined>;
}

export function createCoastAssets({ scenery, cache, boatClock, road, reflection, sky, sea, mountains, poles, city, towers, neon, replaced, spiral, dataset = {} }: Deps) {
  const controller = new AbortController();
  const procedural = road?.mesh.material;
  const roads = new Map<string, CoastRoad | 'loading' | 'failed'>(); // by road set and tier
  let roadKey = ''; // the set and tier the road wants now
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
    let requested = false, failed = false, handle: ModelHandle | null = null;
    const fallback = (reason: string): void => { failed = true; dataset[status] = `fallback:${reason}`; };
    const part = {
      attached: false,
      wanted: (look: TrackLook | undefined): boolean => look?.[slot] === id,
      pending: (look: TrackLook | undefined): boolean => part.wanted(look) && !part.attached && !failed,
      /** True when the model just joined the scene: its programs need the warmup. */
      update(look: TrackLook | undefined, racing: boolean): boolean {
        if (!part.wanted(look)) return false;
        if (!requested) {
          requested = true;
          dataset[status] = 'loading';
          cache.load(id, { signal: controller.signal }).then(result => {
            if (controller.signal.aborted) {
              if (result.kind === 'model') result.release();
              return;
            }
            if (result.kind === 'model') { handle = result; return; }
            fallback(result.reason);
            console.warn(`[coast-assets] ${id} → ${result.fallback} (${result.reason})`);
          }, () => { if (!controller.signal.aborted) fallback('load'); });
        }
        if (!handle || part.attached) return false;
        if (racing) { dataset[status] = 'waiting-for-race-end'; return false; }
        try { attach(handle.instance()); }
        catch (error) {
          detach(); handle.release(); handle = null;
          fallback('attach');
          console.warn(`[coast-assets] ${id} → procedural (${error})`);
          return false;
        }
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
  const spiralKit = spiral && lateModel('spiral-landmarks', 'landmarks', 'spiralLandmarks', source => spiral.attachKit(source), () => spiral.detachKit());
  const requiredScenery = [scan, boats, cityKit, landmarks, spiralKit];

  function loadRoad(id: string, tier: MaterialTier, key: string, { load, anisotropy }: Road): void {
    roads.set(key, 'loading');
    const files = coastRoadFiles(TIERS[tier], id);
    void Promise.allSettled([files.baseColor, files.normal, files.packed].map(load)).then(([base, normals, data]) => {
      if (base?.status === 'fulfilled' && normals?.status === 'fulfilled' && data?.status === 'fulfilled') {
        const made = createCoastRoadMaterial({ baseColor: base.value, normal: normals.value, packed: data.value }, anisotropy,
          { detail: tier === 'ultra', ...reflection && { reflection: reflection.uniforms } });
        if (controller.signal.aborted) made.dispose(); else roads.set(key, made);
        return;
      }
      for (const entry of [base, normals, data]) if (entry?.status === 'fulfilled') entry.value.dispose();
      if (controller.signal.aborted) return;
      roads.set(key, 'failed');
      console.warn(`[coast-assets] ${id} ${tier} → procedural (texture load failed)`);
    });
  }
  /** The loaded set for `id` at this tier, requested on first use; null while it loads, after a failure and on Low. */
  function roadSet(id: string | undefined, tier: MaterialTier | null, key: string, failed: () => void): CoastRoad | null {
    if (!id || !tier) return null;
    if (!roads.has(key)) loadRoad(id, tier, key, road!);
    const ready = roads.get(key);
    if (ready === 'failed') failed(); // prefetch may have started the request without a surface status callback
    return typeof ready === 'object' ? ready : null;
  }
  function roadPending(id: string | undefined, tier: MaterialTier | null, key: string, material?: Material | Material[]): boolean {
    if (!road || !id || !tier) return false;
    const entry = roads.get(key);
    return entry !== 'failed' && (typeof entry !== 'object' || entry.material !== material);
  }

  /** Frees the sets and tiers left behind: neither wanted by the road or a surface now, nor still worn by one. */
  function sweep(): void {
    for (const [key, entry] of roads) if (key !== roadKey && typeof entry === 'object' && entry.material !== road!.mesh.material && surfaces.every(part => key !== part.key && entry !== part.laid)) { entry.dispose(); roads.delete(key); }
  }

  function updateRoad(look: TrackLook | undefined, quality: VfxQuality, racing: boolean, preset: string, ultra: boolean): boolean {
    if (!road) return false;
    const tier = look ? coastRoadTier(quality, ultra) : null;
    roadKey = `${look?.road}:${tier}`;
    const want = roadSet(look?.road, tier, roadKey, () => { dataset.coastRoad = 'fallback'; dataset.coastRoadSet = 'none'; });
    want?.setWetness(coastWetness(preset, look!.wetness));
    const target = want?.material ?? procedural!, swap = road.mesh.material !== target && !racing;
    if (swap) {
      road.mesh.material = target;
      dataset.coastRoad = want ? tier! : roads.get(roadKey) === 'failed' ? 'fallback' : 'procedural';
      dataset.coastRoadSet = want ? look!.road : 'none';
      sweep();
    }
    updateMirror(!!want && road.mesh.material === want.material, quality, preset, racing, look?.wetness);
    return swap && !!want;
  }

  /** A second surface in a look's own set, through the road's shader (wetness, puddles, mirror): the Neon land (task
   *  5b) and the Sky Spiral ribbon (task 8c). Like the road it is laid only outside a race; `update` is true when
   *  the set just joined the scene and needs the warmup. A set of its own per slot: a surface may edit its material. */
  function surface(slot: 'ground' | 'helix', status: string, pave?: (material: Material | null) => void) {
    const part = {
      key: '', laid: null as CoastRoad | null, // the set and tier wanted now; the set on the surface
      pending(look: TrackLook | undefined, tier: MaterialTier | null): boolean {
        return !!pave && roadPending(look?.[slot], tier, `${look?.[slot]}:${tier}:${slot}`, part.laid?.material);
      },
      update(look: TrackLook | undefined, quality: VfxQuality, racing: boolean, preset: string, ultra: boolean): boolean {
        if (!road || !pave) return false;
        const id = look?.[slot], tier = id ? coastRoadTier(quality, ultra) : null;
        part.key = `${id}:${tier}:${slot}`;
        const want = roadSet(id, tier, part.key, () => { dataset[status] = 'fallback'; });
        want?.setWetness(coastWetness(preset, look!.wetness));
        if (want === part.laid || racing) return false;
        pave((part.laid = want)?.material ?? null);
        if (want || dataset[status] !== 'fallback') dataset[status] = want ? tier! : 'procedural';
        sweep();
        return !!want;
      },
    };
    return part;
  }
  const ground = surface('ground', 'neonGround', neon && (material => neon.pave(material)));
  const helix = surface('helix', 'spiralRoad', spiral && (material => spiral.pave(material)));
  const surfaces = [ground, helix];

  /** Mirror only while the KTX2 asphalt that samples it is on the road; never while a swap waits for the race end. */
  function updateMirror(onRoad: boolean, quality: VfxQuality, preset: string, racing: boolean, wetness?: TrackLook['wetness']): void {
    const strength = onRoad ? wetReflectionStrength(quality, preset, wetness) : 0;
    reflection?.setStrength(strength);
    if (strength > 0 && (!mirrored || (racing && !wasRacing))) retag = true;
    mirrored = strength > 0; wasRacing = racing;
  }

  return {
    /** Ready only after selected assets are installed or their loads have failed. Call after updating the look. */
    /** Start selected-map downloads immediately; leave model attachment and material swaps to update(). */
    prefetch(trackId: string, quality: VfxQuality, ultra = false): void {
      const look = detailedTrackLook(trackId, quality);
      if (!look || !road) return;
      for (const model of requiredScenery) model?.update(look, true); // true prevents attaching to the previous track
      const tier = coastRoadTier(quality, ultra);
      if (!tier) return;
      for (const slot of ['road', 'ground', 'helix'] as const) {
        const id = look[slot];
        if (!id) continue;
        if (slot === 'ground' && !neon || slot === 'helix' && !spiral) continue;
        const key = `${id}:${tier}${slot === 'road' ? '' : ':' + slot}`;
        roadSet(id, tier, key, () => {});
      }
    },
    sceneryPending(trackId: string, quality: VfxQuality, ultra = false): boolean {
      const look = detailedTrackLook(trackId, quality);
      if (!look) return false;
      const tier = coastRoadTier(quality, ultra);
      return !!sky?.pending || !!sea?.pending || requiredScenery.some(model => model?.pending(look))
        || roadPending(look.road, tier, `${look.road}:${tier}`, road?.mesh.material)
        || surfaces.some(part => part.pending(look, tier));
    },
    /** Per frame; true when new materials joined the scene and the caller must run its shader warmup. */
    update(trackId: string, quality: VfxQuality, racing: boolean, preset = 'track', ultra = false, route?: ClassicRoad, distance = 0, seed?: number): boolean {
      const look = detailedTrackLook(trackId, quality);
      const joined = scan.update(look, racing), sailing = boats?.update(look, racing) ?? false;
      const built = cityKit?.update(look, racing) ?? false, marked = landmarks?.update(look, racing) ?? false;
      // All or nothing: half a kit never replaces the procedural city. `route` is the authored loop (not practice).
      const kitted = !!route && !!cityKit?.attached && cityKit.wanted(look) && !!landmarks?.attached;
      const drawn = scan.attached && scan.wanted(look) || kitted;
      if (mountains) mountains.material.visible = !drawn;
      if (city && trackLook(trackId)?.scenery) city.visible = !drawn; // world.js sets it on a track change only
      if (drawn !== bare) show(towers, !(bare = drawn));
      if (kitted !== dressed) show(replaced, !(dressed = kitted));
      if (poles) poles.material.visible = !drawn; // after `replaced`, which lists the posts for the Neon kits
      if (kitted) neon?.update(route, distance, quality, seed); else neon?.hide();
      sky?.update(trackId, preset, quality, ultra); // its program exists from creation: nothing to warm up
      sea?.update(trackId, preset, quality); // after the sky: the water shows only under the dome it mirrors
      const raised = spiralKit?.update(look, racing) ?? false;
      // After the sky: the dome moves under the course only once it shows.
      spiral?.update(trackId, preset, quality, !!spiralKit?.attached && spiralKit.wanted(look), ultra);
      const laid = ground.update(look, quality, racing, preset, ultra), decked = helix.update(look, quality, racing, preset, ultra);
      return updateRoad(look, quality, racing, preset, ultra) || laid || decked || raised || joined || sailing || built || marked;
    },
    dispose(): void {
      controller.abort();
      boats?.dispose(); scan.dispose(); landmarks?.dispose(); cityKit?.dispose(); neon?.dispose(); spiralKit?.dispose();
      if (mountains) mountains.material.visible = true;
      if (poles) poles.material.visible = true;
      if (bare) { city && (city.visible = true); show(towers, true); }
      if (dressed) show(replaced, true);
      if (road) { road.mesh.material = procedural!; road.mesh.onBeforeRender = onBeforeRender; }
      reflection?.dispose(); sea?.dispose(); spiral?.dispose(); sky?.dispose();
      for (const entry of roads.values()) if (typeof entry === 'object') entry.dispose();
      roads.clear();
    },
  };
}

interface Ktx2TextureLoader { loadAsync(url: string): Promise<Texture> }
interface WorldRenderer { capabilities: { getMaxAnisotropy(): number; maxTextureSize: number } }

/** World wiring: the track model cache is loaded on demand and shares the renderer's KTX2 transcoder. */
export function createWorldCoastAssets(renderer: WorldRenderer,
  targets: { scene: Object3D & Pick<Scene, 'background' | 'fog'>; spiral: SpiralParts; scenery: Scenery & { group: { position: Vector3 } }; road: Road['mesh'] } & Pick<Parameters<typeof createCoastSky>[0], 'sky' | 'sun'> & Pick<Parameters<typeof createCoastSea>[0], 'sea' | 'seaLines'> & Pick<Deps, 'mountains' | 'poles' | 'city' | 'towers' | 'replaced'>,
  dataset: Deps['dataset'], baseUrl = import.meta.env.BASE_URL) {
  const loadKtx2 = createKtx2Provider(renderer, baseUrl);
  let models: Promise<ModelCache> | undefined;
  const loadModel: ModelCache['load'] = async (id, options) => {
    models ??= import('./asset-model-loader.ts').then(({ createModelCache }) => createModelCache({ baseUrl, loadKtx2 }));
    return (await models).load(id, options);
  };
  const loadTexture = (url: string) => waitForSceneTexture(loadKtx2().then(loader =>
    (loader as unknown as Ktx2TextureLoader).loadAsync(modelUrl(url, baseUrl))));
  const road: Road = {
    mesh: targets.road,
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()), // grazing-angle asphalt; Medium+ only
    load: file => loadTexture(file.url),
  };
  const sky = createCoastSky({ sky: targets.sky, sun: targets.sun, load: loadTexture, maxTextureSize: renderer.capabilities.maxTextureSize, dataset });
  const sea = createCoastSea({ sea: targets.sea, seaLines: targets.seaLines, dome: sky.dome, origin: targets.scenery.group.position, load: loadTexture, dataset });
  return createCoastAssets({ scenery: targets.scenery, boatClock: targets.sea.material.uniforms.time!, road, sky, sea, mountains: targets.mountains, poles: targets.poles, city: targets.city, towers: targets.towers, neon: createNeonScenery(targets.scene), replaced: targets.replaced, spiral: createSpiralLook({ parts: targets.spiral, dome: sky.dome, home: targets.sky, scene: targets.scene, clock: targets.sea.material.uniforms.time! }), dataset, reflection: createWetReflection(), cache: withGreenery({ load: loadModel }) });
}
