// `?model=probe` Garage adapter (docs/designs/3d-pipeline/phase2-model-contracts.md §2): while the Garage is open,
// a manifest model replaces the procedural Roadster in Garage Home and the Preview Studio. Production (no query)
// never creates it. The model is held while the Garage stays open and released when it closes.
// Task 4b (`?model=roadster`): the same adapter also dresses the Home showcase car and the race car, one car at a time.
import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import type { ModelCache, ModelHandle } from './asset-model-loader.ts';
import type { ModelQuality } from './model-manifest.ts';
import { bindGarageRig, type GarageRig } from './garage-model-rig.ts';

const MODEL_PARAMS: Readonly<Record<string, string>> = { probe: 'pipeline-probe', roadster: 'roadster2' };
const HIDDEN_LAYER = 31; // no camera enables it; the frame loop rewrites `visible` on car parts, never `layers`

/** Task 4b: the roadster GLB also dresses the Home showcase and race car; the probe stays Garage-only. */
export const dressesRaceCar = (id: string): boolean => id === 'roadster2';

export function garageModelId(search: string): string | null {
  const value = new URLSearchParams(search).get('model');
  return value && Object.hasOwn(MODEL_PARAMS, value) ? MODEL_PARAMS[value]! : null;
}

/** A car to dress: `keep` (aero VFX riding on the car) stays drawn, `scene` supplies lights for compiling. */
export interface GarageModelHost { name: 'home' | 'studio' | 'showcase'; car: Object3D; keep: Object3D; scene: Scene }
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

  function undress(host: GarageModelHost): void {
    const dressing = dressed.get(host);
    if (!dressing) return;
    dressing.instance.removeFromParent();
    dressing.rig.dispose();
    for (const [object, mask] of dressing.masks) object.layers.mask = mask;
    dressed.delete(host);
  }

  async function dress(host: GarageModelHost, from: ModelHandle): Promise<void> {
    pending.add(host); // request() and the per-frame sync() never dress one host twice at once
    const instance = from.instance();
    instance.userData.garageModel = id;
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
        part.traverse(object => { masks.set(object, object.layers.mask); object.layers.set(HIDDEN_LAYER); });
      }
    }
    rig.update();
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

/** World wiring: null unless the page opted in. The loader (GLTFLoader) is imported only then. */
export function createWorldGarageModel(canvas: HTMLCanvasElement, renderer: Pick<WebGLRenderer, 'compileAsync'>, camera: Camera,
  search = location.search, baseUrl = import.meta.env.BASE_URL) {
  const id = garageModelId(search);
  if (!id) return null;
  const everywhere = dressesRaceCar(id);
  const loadKtx2 = createKtx2Provider(renderer, baseUrl);
  const cache = import('./asset-model-loader.ts').then(({ createModelCache }) => createModelCache({ baseUrl, loadKtx2 }));
  const model = createGarageModel({
    id, dataset: canvas.dataset,
    cache: { load: async (key, options) => (await cache).load(key, options) },
    compile: (object, scene) => renderer.compileAsync(object, camera, scene),
  });
  const restored = (): void => { void model.warmAgain(); };
  canvas.addEventListener('webglcontextrestored', restored);
  return {
    /** Per frame, before posing: dresses the car on screen. `studio` only while the Preview Studio camera is on;
     *  `showcase` only while the Coming Soon stage renders the Home preview; `home` is the Home/race player car. */
    frame(quality: ModelQuality, phase: string, garageOpen: boolean, studio: GarageModelHost | null, showcase: GarageModelHost | null, home: GarageModelHost): void {
      if (studio) { model.sync(true, quality, studio); return; }
      const shown = showcase ?? (garageOpen || everywhere ? home : null);
      model.sync(garageOpen || everywhere, quality, shown, garageOpen ? 'garage' : phase === 'racing' ? 'race' : 'drive');
    },
    release: model.release,
    dispose() { canvas.removeEventListener('webglcontextrestored', restored); model.dispose(); },
  };
}
