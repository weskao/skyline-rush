// The four authored pickup GLBs, fetched and parsed once per page. Every renderer that shows pickups (the race
// world, the guide preview) takes its own material clones; geometry and textures are shared.
import { BufferAttribute, type BufferGeometry, type Mesh, type MeshStandardMaterial, type Texture } from 'three';
import type { ModelHandle } from './asset-model-loader.ts';
import { createKtx2Provider } from './garage-model.ts';

export const PICKUP_TIERS = ['cell', 'can', 'tank', 'overcharge'] as const;
export type PickupTier = (typeof PICKUP_TIERS)[number];
type ByTier<T> = Record<PickupTier, T>;
export interface PickupModels { geometries: ByTier<BufferGeometry>; materials: ByTier<MeshStandardMaterial>; release(): void }
interface Shared { geometries: ByTier<BufferGeometry>; materials: ByTier<MeshStandardMaterial>; handles: ModelHandle[] }

/** Resting emissive level of the baked glow maps; pulsePickupMaterial (pickup-art.js) breathes around it. */
export const PICKUP_GLOW = 0.9;
const REFLECTION = 0.5;
let shared: Promise<Shared | null> | null = null, users = 0;

/** Meshopt leaves quantized positions plus a compensating node transform; an instanced pool needs plain local vertices. */
export function plainGeometry(mesh: Mesh): BufferGeometry {
  mesh.updateWorldMatrix(true, false);
  const geometry = mesh.geometry.clone(), source = geometry.getAttribute('position'), flat = new Float32Array(source.count * 3);
  for (let i = 0; i < source.count; i++) flat.set([source.getX(i), source.getY(i), source.getZ(i)], i * 3);
  geometry.setAttribute('position', new BufferAttribute(flat, 3));
  return geometry.applyMatrix4(mesh.matrixWorld);
}

async function load(renderer: unknown, baseUrl: string): Promise<Shared | null> {
  const { createModelCache } = await import('./asset-model-loader.ts');
  const cache = createModelCache({ baseUrl, loadKtx2: createKtx2Provider(renderer, baseUrl) });
  const results = await Promise.all(PICKUP_TIERS.map(tier => cache.load(`pickup-${tier}`)));
  const handles = results.filter((result): result is ModelHandle => result.kind === 'model');
  const geometries: Partial<ByTier<BufferGeometry>> = {}, materials: Partial<ByTier<MeshStandardMaterial>> = {};
  if (handles.length === PICKUP_TIERS.length) PICKUP_TIERS.forEach((tier, i) => {
    const mesh = handles[i].instance().getObjectByName(`pickup_${tier}`) as Mesh | undefined;
    if (!mesh?.isMesh) return;
    geometries[tier] = plainGeometry(mesh);
    materials[tier] = mesh.material as MeshStandardMaterial;
  });
  if (Object.keys(geometries).length === PICKUP_TIERS.length)
    return { geometries: geometries as ByTier<BufferGeometry>, materials: materials as ByTier<MeshStandardMaterial>, handles };
  // All four or none: a half-loaded set would mix two art styles on one track.
  Object.values(geometries).forEach(geometry => geometry.dispose());
  handles.forEach(handle => handle.release());
  return null;
}

/** Resolves to null when the models cannot be loaded; the caller keeps the procedural pickups (pickup-art.js). */
export function acquirePickupModels(renderer: unknown, envMap: Texture | null,
  baseUrl: string = import.meta.env.BASE_URL): Promise<PickupModels | null> {
  users++;
  const mine = (shared ??= load(renderer, baseUrl).catch(() => null));
  const leave = (base: Shared | null): void => {
    if (--users > 0) return;
    shared = null; // the next acquire fetches again (the HTTP cache makes that cheap)
    if (!base) return;
    Object.values(base.geometries).forEach(geometry => geometry.dispose());
    base.handles.forEach(handle => handle.release());
  };
  return mine.then(base => {
    if (!base) { leave(null); return null; }
    const materials = {} as ByTier<MeshStandardMaterial>;
    for (const tier of PICKUP_TIERS) {
      // A PMREM belongs to one renderer, so each renderer's clone carries its own reflection map.
      const material = materials[tier] = base.materials[tier].clone();
      material.envMap = envMap;
      material.envMapIntensity = REFLECTION;
      material.userData.glow = PICKUP_GLOW;
    }
    let released = false;
    return {
      geometries: base.geometries, materials,
      release() {
        if (released) return;
        released = true;
        Object.values(materials).forEach(material => material.dispose());
        leave(base);
      },
    };
  });
}
