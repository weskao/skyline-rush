// `?model=probe` Garage adapter (docs/designs/3d-pipeline/phase2-model-contracts.md §2): while the Garage is open,
// a manifest model replaces the procedural Roadster in Garage Home and the Preview Studio. Production (no query)
// never creates it. The model is held while the Garage stays open and released when it closes.
import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import type { ModelCache, ModelHandle } from './asset-model-loader.ts';
import type { ModelQuality } from './model-manifest.ts';

const MODEL_PARAMS: Readonly<Record<string, string>> = { probe: 'pipeline-probe' };
const HIDDEN_LAYER = 31; // no camera enables it; the frame loop rewrites `visible` on car parts, never `layers`

export function garageModelId(search: string): string | null {
  const value = new URLSearchParams(search).get('model');
  return value && Object.hasOwn(MODEL_PARAMS, value) ? MODEL_PARAMS[value]! : null;
}

/** A car to dress: `keep` (aero VFX riding on the car) stays drawn, `scene` supplies lights for compiling. */
export interface GarageModelHost { name: 'home' | 'studio'; car: Object3D; keep: Object3D; scene: Scene }

export interface GarageModelDeps {
  id: string;
  cache: Pick<ModelCache, 'load'>;
  /** Builds the instance's shader programs before it is first drawn (renderer.compileAsync). */
  compile(object: Object3D, scene: Scene): Promise<unknown>;
  /** QA state target, e.g. the canvas dataset: garageModel, garageModelInstances, garageModelWarmups. */
  dataset: Record<string, string | undefined>;
}

interface Dressing { instance: Object3D; masks: Map<Object3D, number> }

export function createGarageModel({ id, cache, compile, dataset }: GarageModelDeps) {
  let open = false, quality: ModelQuality | null = null, handle: ModelHandle | null = null;
  let controller: AbortController | null = null, warmups = 0, status = 'off';
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
    for (const [object, mask] of dressing.masks) object.layers.mask = mask;
    dressed.delete(host);
  }

  async function dress(host: GarageModelHost, from: ModelHandle): Promise<void> {
    pending.add(host); // request() and the per-frame sync() never dress one host twice at once
    const instance = from.instance();
    instance.userData.garageModel = id;
    try { await compile(instance, host.scene); } catch { return; } finally { pending.delete(host); } // keeps the Roadster
    warmups++;
    if (handle !== from || !open) return; // closed or swapped while compiling
    const masks = dressed.get(host)?.masks ?? new Map<Object3D, number>();
    dressed.get(host)?.instance.removeFromParent();
    if (!masks.size) {
      for (const part of host.car.children) {
        if (part === host.keep) continue;
        part.traverse(object => { masks.set(object, object.layers.mask); object.layers.set(HIDDEN_LAYER); });
      }
    }
    host.car.add(instance);
    dressed.set(host, { instance, masks });
    report();
  }

  async function request(next: ModelQuality): Promise<void> {
    controller?.abort();
    const own = controller = new AbortController();
    try {
      const result = await cache.load(id, { quality: next, signal: own.signal });
      if (own !== controller) { if (result.kind === 'model') result.release(); return; }
      controller = null;
      if (result.kind === 'fallback') { status = `fallback:${result.reason}`; report(); return; }
      const old = handle;
      handle = result;
      status = 'model';
      await Promise.all([...wanted].map(host => dress(host, result))); // a later dress replaces an earlier one
      old?.release(); // only after every host shows the new instance
      report();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
    }
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
    sync(nextOpen: boolean, nextQuality: ModelQuality, host: GarageModelHost | null): void {
      if (!nextOpen) { if (open || status !== 'off') close(); return; }
      if (!open) { open = true; status = 'loading'; report(); }
      if (nextQuality !== quality) { quality = nextQuality; void request(nextQuality); }
      if (host) wanted.add(host);
      if (host && handle && !dressed.has(host) && !pending.has(host)) void dress(host, handle);
    },
    /** After webglcontextrestored: rebuild the programs of every shown instance; nothing is re-fetched. */
    warmAgain(): Promise<unknown> {
      return Promise.all([...dressed].map(async ([host, { instance }]) => { await compile(instance, host.scene); warmups++; report(); }));
    },
    dispose: close,
  };
}

/** World wiring: null unless the page opted in. The loader (GLTFLoader) is imported only then. */
export function createWorldGarageModel(canvas: HTMLCanvasElement, renderer: Pick<WebGLRenderer, 'compileAsync'>, camera: Camera,
  search = location.search, baseUrl = import.meta.env.BASE_URL) {
  const id = garageModelId(search);
  if (!id) return null;
  const cache = import('./asset-model-loader.ts').then(({ createModelCache }) => createModelCache({ baseUrl }));
  const model = createGarageModel({
    id, dataset: canvas.dataset,
    cache: { load: async (key, options) => (await cache).load(key, options) },
    compile: (object, scene) => renderer.compileAsync(object, camera, scene),
  });
  const restored = (): void => { void model.warmAgain(); };
  canvas.addEventListener('webglcontextrestored', restored);
  return { sync: model.sync, dispose() { canvas.removeEventListener('webglcontextrestored', restored); model.dispose(); } };
}
