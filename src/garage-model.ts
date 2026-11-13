// `?model=probe` Garage adapter (docs/designs/3d-pipeline/phase2-model-contracts.md §2): while the Garage is open,
// a manifest model replaces the procedural Roadster in Garage Home and the Preview Studio. Production (no query)
// never creates it. The model is held while the Garage stays open and released when it closes.
// Task 4b (`?model=roadster`): the same adapter also dresses the Home showcase car and the race car, one car at a time.
// Task 7: the equipped car's model (car-catalog.ts) is dressed the same way with no query; the Roadster has none.
import type { Camera, Material, Mesh, MeshStandardMaterial, Object3D, Scene, Texture, WebGLRenderer } from 'three';
import type { ModelCache, ModelHandle } from './asset-model-loader.ts';
import type { ModelQuality } from './model-manifest.ts';
import { bindGarageRig, type GarageRig } from './garage-model-rig.ts';
import { applyCarReflections } from './car-reflections.ts';
import { CARS, equippedCarModel } from './car-catalog.ts';
import { REAR_PORTS } from './aero-vfx.js';

const MODEL_PARAMS: Readonly<Record<string, string>> = { probe: 'pipeline-probe', roadster: 'roadster2' };
const EQUIPPED_MODELS = new Set(Object.values(CARS).map(car => car.model));
const MODEL_SCALES = new Map(Object.values(CARS).flatMap(car => car.model && car.scale ? [[car.model, car.scale]] : []));
const HIDDEN_LAYER = 31; // no camera enables it; the frame loop rewrites `visible` on car parts, never `layers`

/** Player-car GLBs also dress the Home showcase and race car; the probe stays Garage-only. */
export const dressesRaceCar = (id: string): boolean => id === MODEL_PARAMS.roadster || EQUIPPED_MODELS.has(id);

/** The softened map the host's procedural car reflects (car-reflections.ts), if one was applied to it. */
function carMapOf(car: Object3D): Texture | null {
  let map: Texture | null = null;
  car.traverse(object => {
    for (const material of ([] as (Material | undefined)[]).concat((object as Mesh).material)) map ??= (material as MeshStandardMaterial | undefined)?.envMap ?? null;
  });
  return map;
}

export function garageModelId(search: string): string | null {
  const value = new URLSearchParams(search).get('model');
  return value && Object.hasOwn(MODEL_PARAMS, value) ? MODEL_PARAMS[value]! : null;
}

/** A car to dress: `keep` (aero VFX riding on the car) stays drawn, `scene` supplies lights for compiling. */
export interface GarageModelHost { name: 'home' | 'studio' | 'showcase'; car: Object3D; keep: Object3D; scene: Scene; fitAirflow?(model?: Object3D): void }
/** garage: every car shown since the Garage opened stays dressed. drive: only the car on screen. race: drive, but
 *  never attach or compile a new instance (after GO), so a race shows the GLB only if it was dressed before. */
export type DressMode = 'garage' | 'drive' | 'race';

export interface GarageModelDeps {
  id: string;
  cache: Pick<ModelCache, 'load'>;
  /** Builds the instance's shader programs before it is first drawn (renderer.compileAsync). */
  compile(object: Object3D, scene: Scene): Promise<unknown>;
  /** QA state target, e.g. the canvas dataset: garageModel, garageModelInstances, garageModelWarmups. */
  dataset: Record<string, string | undefined>;
}

interface Dressing { instance: Object3D; rig: GarageRig; masks: Map<Object3D, number> }

export function createGarageModel({ id, cache, compile, dataset }: GarageModelDeps) {
  let open = false, quality: ModelQuality | null = null, handle: ModelHandle | null = null;
  let controller: AbortController | null = null, warmups = 0, status = 'off', held = false;
  const dressed = new Map<GarageModelHost, Dressing>();
  const pending = new Set<GarageModelHost>();
  const wanted = new Set<GarageModelHost>(); // every host shown since the Garage opened

  function report(): void {
    dataset.garageModel = status;
    dataset.garageModelInstances = JSON.stringify(Object.fromEntries([...dressed].map(([host, d]) => [host.name, d.instance.uuid])));
    dataset.garageModelWarmups = String(warmups);
  }

  /** Rear-port VFX (aero-vfx.js `Rear ports`) sit on the GLB's nozzles when it authors them off the contract ports. */
  function moveRearPorts(host: GarageModelHost, instance?: Object3D): void {
    const rear = host.keep.getObjectByName('Rear ports');
    if (!rear) return;
    rear.position.set(0, 0, 0);
    let node = instance?.getObjectByName('nozzle_rear_01');
    if (!node) return;
    for (; node && node !== instance; node = node.parent ?? undefined) rear.position.add(node.position); // unrotated, unscaled pivots
    rear.position.multiply(instance!.scale); // the instance's display scale (CARS) carries the nozzles outward
    rear.position.x -= REAR_PORTS[0].position[0]; rear.position.y -= REAR_PORTS[0].position[1]; rear.position.z -= REAR_PORTS[0].position[2];
  }

  function undress(host: GarageModelHost): void {
    const dressing = dressed.get(host);
    if (!dressing) return;
    moveRearPorts(host);
    host.fitAirflow?.();
    dressing.instance.removeFromParent();
    dressing.rig.dispose();
    for (const [object, mask] of dressing.masks) object.layers.mask = mask;
    dressed.delete(host);
  }

  async function dress(host: GarageModelHost, from: ModelHandle): Promise<void> {
    pending.add(host); // request() and the per-frame sync() never dress one host twice at once
    const instance = from.instance();
    instance.userData.garageModel = id;
    const scale = MODEL_SCALES.get(id);
    if (scale) instance.scale.set(...scale); // before the airflow fit and the rig, which measure the shown size
    const carMap = carMapOf(host.car); // without it the GLB mirrors the full scene HDRI: washed white in Coast rain
    if (carMap) applyCarReflections(instance, carMap); // before compiling, so no program changes after GO
    const rig = bindGarageRig(host.car, instance); // rig.update() only after compiling: compileAsync skips hidden parts (lift fans)
    try { await compile(instance, host.scene); } catch { rig.dispose(); return; } finally { pending.delete(host); } // keeps the Roadster
    warmups++;
    if (handle !== from || !open || held || !wanted.has(host)) { rig.dispose(); return; } // closed, swapped, released or GO while compiling
    const old = dressed.get(host);
    const masks = old?.masks ?? new Map<Object3D, number>();
    old?.instance.removeFromParent();
    old?.rig.dispose();
    if (!masks.size) {
      for (const part of host.car.children) {
        if (part === host.keep || (part === host.car.userData.jets && !instance.getObjectByName('lift_fans'))) continue; // aero VFX (and procedural fans, unless authored) stay drawn
        part.traverse(object => { if (!rig.riders.includes(object)) { masks.set(object, object.layers.mask); object.layers.set(HIDDEN_LAYER); } }); // riders move to the GLB body (rig)
      }
    }
    host.fitAirflow?.(instance); // measure the authored neutral pose before binding the current wheel/wing animation
    rig.update();
    moveRearPorts(host, instance);
    host.car.add(instance);
    dressed.set(host, { instance, rig, masks });
    report();
  }

  async function request(next: ModelQuality): Promise<void> {
    controller?.abort();
    const own = controller = new AbortController();
    try {
      const result = await cache.load(id, { quality: next, signal: own.signal });
      if (own !== controller) { if (result.kind === 'model') result.release(); return; }
      controller = null;
      if (result.kind === 'fallback') { console.warn(`[model-probe] ${id} → ${result.fallback} (${result.reason})`); status = `fallback:${result.reason}`; report(); return; }
      const old = handle;
      handle = result;
      status = 'model';
      if (held) for (const host of [...dressed.keys()]) undress(host); // mid-race: procedural until the race stops
      else await Promise.all([...wanted].map(host => dress(host, result))); // a later dress replaces an earlier one
      old?.release(); // only after no host shows an old instance
      report();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
    }
  }

  function release(host: GarageModelHost): void {
    if (!wanted.delete(host) && !dressed.has(host)) return;
    undress(host);
    report();
  }

  function close(): void {
    open = false;
    quality = null;
    controller?.abort();
    controller = null;
    for (const host of [...dressed.keys()]) undress(host);
    wanted.clear();
    handle?.release();
    handle = null;
    status = 'off';
    report();
  }

  return {
    /** Per frame: cheap when nothing changed. `host` is the car currently shown (Home or Studio), or null. */
    sync(nextOpen: boolean, nextQuality: ModelQuality, host: GarageModelHost | null, mode: DressMode = 'garage'): void {
      if (!nextOpen) { if (open || status !== 'off') close(); return; }
      if (!open) { open = true; status = 'loading'; report(); }
      held = mode === 'race';
      if (nextQuality !== quality && !held) { quality = nextQuality; void request(nextQuality); } // a tier change waits for the race to stop
      if (host && mode !== 'garage' && wanted.size > (wanted.has(host) ? 1 : 0)) for (const other of wanted) if (other !== host) release(other);
      if (host) wanted.add(host);
      if (host && handle && !held && !dressed.has(host) && !pending.has(host)) void dress(host, handle);
      // shortcut: world.js calls sync before posing the car, so the GLB trails the pose by one frame; add a post-pose hook if it shows.
      if (host) dressed.get(host)?.rig.update();
    },
    /** After webglcontextrestored: rebuild the programs of every shown instance; nothing is re-fetched. */
    warmAgain(): Promise<unknown> {
      return Promise.all([...dressed].map(async ([host, { instance }]) => { await compile(instance, host.scene); warmups++; report(); }));
    },
    release,
    dispose: close,
  };
}

interface Ktx2Like { setTranscoderPath(path: string): Ktx2Like; detectSupport(renderer: never): Ktx2Like }
type Ktx2Class = new () => Ktx2Like;
const importKtx2 = async (): Promise<Ktx2Class> => (await import('three/examples/jsm/loaders/KTX2Loader.js')).KTX2Loader as unknown as Ktx2Class;

/** One KTX2Loader per world, on the existing renderer; the transcoder is served from `public/basis/`. */
export function createKtx2Provider(renderer: unknown, baseUrl: string, load: () => Promise<Ktx2Class> = importKtx2) {
  let loader: Promise<Ktx2Like> | undefined;
  return (): Promise<Ktx2Like> => (loader ??= load().then(Ktx2 => new Ktx2().setTranscoderPath(`${baseUrl}basis/`).detectSupport(renderer as never)));
}

/** World wiring. Idle until a model is wanted: the equipped car's own model first, else `?model=`. GLTFLoader is imported only then. */
export function createWorldGarageModel(canvas: HTMLCanvasElement, renderer: Pick<WebGLRenderer, 'compileAsync'>, camera: Camera,
  search = location.search, baseUrl = import.meta.env.BASE_URL, carModel: () => string | null = equippedCarModel) {
  const forced = garageModelId(search);
  const loadKtx2 = createKtx2Provider(renderer, baseUrl);
  let cache: Promise<ModelCache> | undefined;
  let id: string | null = null, model: ReturnType<typeof createGarageModel> | null = null;
  function use(next: string | null): void {
    model?.dispose(); // the cars are procedural again before another model dresses them
    id = next;
    model = next === null ? null : createGarageModel({
      id: next, dataset: canvas.dataset,
      cache: { load: async (key, options) => (await (cache ??= import('./asset-model-loader.ts').then(({ createModelCache }) => createModelCache({ baseUrl, loadKtx2 })))).load(key, options) },
      compile: (object, scene) => renderer.compileAsync(object, camera, scene),
    });
  }
  const restored = (): void => { void model?.warmAgain(); };
  canvas.addEventListener('webglcontextrestored', restored);
  return {
    /** Per frame, before posing: dresses the car on screen. `studio` only while the Preview Studio camera is on;
     *  `showcase` only while the Coming Soon stage renders the Home preview; `home` is the Home/race player car. */
    frame(quality: ModelQuality, phase: string, garageOpen: boolean, studio: GarageModelHost | null, showcase: GarageModelHost | null, home: GarageModelHost): void {
      const wanted = carModel() ?? forced; // `?model=` (every 3d=1 dev URL) dresses the procedural Roadster only, never over a car with its own model
      if (wanted !== id && phase !== 'racing') use(wanted); // the car changes in the Garage only; never rebuild mid-race
      if (!model || id === null) return;
      if (studio) { model.sync(true, quality, studio); return; }
      const everywhere = dressesRaceCar(id);
      const shown = showcase ?? (garageOpen || everywhere ? home : null);
      model.sync(garageOpen || everywhere, quality, shown, garageOpen ? 'garage' : phase === 'racing' ? 'race' : 'drive');
    },
    release: (host: GarageModelHost): void => model?.release(host),
    dispose() { canvas.removeEventListener('webglcontextrestored', restored); model?.dispose(); },
  };
}
