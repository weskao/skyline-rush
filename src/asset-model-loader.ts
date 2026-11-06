// Phase 2 async GLB loader. Contract: docs/designs/3d-pipeline/phase2-model-contracts.md §2.
import { Texture } from 'three';
import type { Material, Mesh, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MODEL_MANIFEST, modelUrl } from './model-manifest.ts';
import type { FallbackKey, ModelManifestEntry, ModelQuality } from './model-manifest.ts';

export type FallbackReason =
  | 'missing' | 'network' | 'timeout' | 'invalid' | 'decoder-unavailable'
  | `missing-node:${string}` | `missing-material:${string}`;

export interface ModelHandle { kind: 'model'; id: string; instance(): Object3D; release(): void }
export interface ModelFallback { kind: 'fallback'; id: string; fallback: FallbackKey; reason: FallbackReason }
export type ModelResult = ModelHandle | ModelFallback;

export interface ModelCacheOptions {
  baseUrl: string;
  manifest?: Record<string, ModelManifestEntry>;
  fetch?: (url: string, init: { signal: AbortSignal }) => Promise<Response>;
  timeoutMs?: number;
  loadMeshopt?: () => Promise<unknown>;
}

export interface ModelCache {
  load(id: string, options?: { signal?: AbortSignal; quality?: ModelQuality }): Promise<ModelResult>;
}

interface Disposable { dispose(): void }
/** The parsed original. The cache owns it and its resources; handles only clone the node tree. */
interface Loaded { scene: Object3D; skinned: boolean; resources: Set<Disposable> }
/** One shared fetch + parse per cache key, alive until released, failed or cancelled. */
interface Slot { work: Promise<Loaded | FallbackReason>; controller: AbortController; waiters: number; settled: boolean; refs: number }

class Fail extends Error {
  reason: FallbackReason; // no parameter property: Node's type stripping rejects it
  constructor(reason: FallbackReason) { super(reason); this.reason = reason; }
}

const abortError = (): DOMException => new DOMException('The operation was aborted.', 'AbortError');

/** Rejects with AbortError when `signal` aborts; the shared promise itself is untouched. */
function raceAbort<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => { controller.abort(); reject(new Fail('timeout')); }, ms);
    run(controller.signal).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

async function defaultLoadMeshopt(): Promise<unknown> {
  const { MeshoptDecoder: decoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  await decoder.ready;
  return decoder;
}

function parseGlb(buffer: ArrayBuffer, decoder: unknown): Promise<{ scene: Object3D; required: string[] }> {
  const loader = new GLTFLoader();
  if (decoder) loader.setMeshoptDecoder(decoder as typeof MeshoptDecoder);
  return new Promise((resolve, reject) => {
    try {
      loader.parse(buffer, '', gltf => resolve({ scene: gltf.scene, required: gltf.parser.json.extensionsRequired ?? [] }), reject);
    } catch (error) { reject(error); }
  });
}

/** Collects the unique resources and checks the manifest's exact node and material names. */
function inspect(scene: Object3D, entry: ModelManifestEntry): Loaded {
  const resources = new Set<Disposable>();
  const used = new Set<string>();
  let skinned = false;
  scene.traverse(object => {
    if ((object as { isSkinnedMesh?: boolean }).isSkinnedMesh) skinned = true;
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    resources.add(mesh.geometry);
    for (const material of [mesh.material].flat() as Material[]) {
      resources.add(material);
      used.add(material.name);
      for (const value of Object.values(material)) if (value instanceof Texture) resources.add(value);
    }
  });
  for (const name of entry.nodes) if (!scene.getObjectByName(name)) throw new Fail(`missing-node:${name}`);
  for (const name of entry.materials) if (!used.has(name)) throw new Fail(`missing-material:${name}`);
  return { scene, skinned, resources };
}

export function createModelCache(options: ModelCacheOptions): ModelCache {
  const { baseUrl, manifest = MODEL_MANIFEST, timeoutMs = 15000, loadMeshopt = defaultLoadMeshopt } = options;
  const doFetch = options.fetch ?? ((url, init) => globalThis.fetch(url, init));
  const slots = new Map<string, Slot>();
  let meshopt: Promise<unknown> | undefined;

  // At most one decoder load per cache; a rejection is not remembered so a transient failure can retry.
  const meshoptDecoder = (): Promise<unknown> => (meshopt ??= loadMeshopt().catch(error => { meshopt = undefined; throw error; }));

  async function fetchAndParse(entry: ModelManifestEntry, url: string, signal: AbortSignal): Promise<Loaded> {
    const response = await doFetch(url, { signal }).catch(() => { throw new Fail('network'); });
    if (!response.ok) throw new Fail('missing');
    const buffer = await response.arrayBuffer().catch(() => { throw new Fail('network'); });
    const wantsMeshopt = entry.decoders.includes('meshopt');
    const decoder = wantsMeshopt ? await meshoptDecoder().catch(() => { throw new Fail('decoder-unavailable'); }) : undefined;
    const parsed = await parseGlb(buffer, decoder).catch(() => { throw new Fail('invalid'); });
    if (!wantsMeshopt && parsed.required.includes('EXT_meshopt_compression')) throw new Fail('invalid');
    return inspect(parsed.scene, entry);
  }

  function begin(key: string, entry: ModelManifestEntry, url: string): Slot {
    const controller = new AbortController();
    const slot: Slot = { work: Promise.resolve('network'), controller, waiters: 0, settled: false, refs: 0 };
    slot.work = withTimeout(signal => fetchAndParse(entry, url, signal), timeoutMs, controller)
      .catch((error: unknown) => (error instanceof Fail ? error.reason : 'invalid') as FallbackReason)
      .then(result => {
        slot.settled = true;
        if (typeof result === 'string' && slots.get(key) === slot) slots.delete(key); // failures are not cached
        return result;
      });
    slots.set(key, slot);
    return slot;
  }

  function handleFor(id: string, key: string, slot: Slot, loaded: Loaded): ModelHandle {
    slot.refs++;
    let released = false;
    return {
      kind: 'model',
      id,
      instance: () => (loaded.skinned ? cloneSkinned(loaded.scene) : loaded.scene.clone(true)),
      release() {
        if (released) return;
        released = true;
        if (--slot.refs > 0) return;
        for (const resource of loaded.resources) resource.dispose();
        if (slots.get(key) === slot) slots.delete(key);
      },
    };
  }

  return {
    async load(id, { signal, quality } = {}) {
      const entry = manifest[id];
      if (!entry) throw new TypeError(`Unknown model id "${id}"`);
      if (signal?.aborted) throw abortError();
      const lod = quality ? entry.lods.find(l => l.quality === quality) : undefined;
      const url = modelUrl(lod?.url ?? entry.url, baseUrl);
      const key = `${id}|${url}`;
      const slot = slots.get(key) ?? begin(key, entry, url);
      slot.waiters++;
      try {
        const result = await raceAbort(slot.work, signal);
        if (typeof result === 'string') return { kind: 'fallback', id, fallback: entry.fallback, reason: result };
        return handleFor(id, key, slot, result);
      } finally {
        // Last waiter gone before the fetch settled: cancel it and forget the entry so the next load refetches.
        if (--slot.waiters === 0 && !slot.settled) {
          slot.controller.abort();
          if (slots.get(key) === slot) slots.delete(key);
        }
      }
    },
  };
}
