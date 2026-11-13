// Task 5 close scenery: places coast-scenery.glb pieces in deterministic 120 m chunks, one InstancedMesh per GLB
// primitive. The plan is pure (absolute chunk index + endless seed); the layer only rewrites instance matrices when the
// chunk window or floating origin moves. The model cache handle owns the GLB geometry/materials, never this layer.
import * as THREE from 'three';
import type { ClassicRoad } from './classic-road-routes.ts';
import { seededRng } from './rng.ts';
import type { VfxQuality } from './vfx-settings.ts';

export const COAST_CHUNK_METRES = 120;
export const COAST_PIECES = ['sea_arch', 'cliff_a', 'cliff_b', 'rock_a', 'rock_b', 'palm_a', 'palm_b', 'guard_rail'] as const;
export type CoastPiece = typeof COAST_PIECES[number];

/** Lateral half-depth (m) at scale 1 with the plan's yaw: long pieces lie along the road, round ones use their radius. */
export const PIECE_DEPTH: Readonly<Record<CoastPiece, number>> = {
  sea_arch: 10.4, cliff_a: 5.5, cliff_b: 4.4, rock_a: 2.1, rock_b: 1.3, palm_a: 6, palm_b: 5, guard_rail: .35,
};
/** Upper bound of placements per chunk; sizes the instance pools. */
const MAX_PER_CHUNK: Readonly<Record<CoastPiece, number>> = {
  sea_arch: 1, cliff_a: 1, cliff_b: 1, rock_a: 4, rock_b: 3, palm_a: 1, palm_b: 1, guard_rail: 20,
};
/** Rails are thin: beyond the nearest chunks they are sub-pixel and the procedural rail lights carry the line. */
export const RAIL_CHUNKS = 4;
const AHEAD: Readonly<Record<Exclude<VfxQuality, 'low'>, number>> = { medium: 4, high: 6 };
const MAX_CHUNKS = 2 + AHEAD.high;
const RAIL_LENGTH = 12;
const CURB = 12.4, CLEAR = 20, SEA = -6, ALONG_ROAD = Math.PI / 2;

/** `offset` is lateral metres from the road centre; `yaw` is relative to the road heading (pi/2 = model x along the road). */
export interface Placement { piece: CoastPiece; along: number; offset: number; y: number; yaw: number; scale: number }

export function coastChunkPlan(chunk: number, seed?: number): Placement[] {
  const r = seededRng(seed ?? 0, 'coast-glb-v1:' + chunk);
  const side = (): number => (r() < .5 ? -1 : 1);
  const out: Placement[] = [];
  for (const s of [-1, 1]) for (let i = 0; i < 10; i++) out.push({ piece: 'guard_rail', along: RAIL_LENGTH * (i + .5), offset: s * CURB, y: .76, yaw: ALONG_ROAD, scale: 1 });
  const cliffSide = side();
  const cliff: CoastPiece = r() < .5 ? 'cliff_a' : 'cliff_b';
  const cliffScale = cliff === 'cliff_a' ? 1.4 + r() * .6 : 1.6 + r() * .8;
  out.push({ piece: cliff, along: 50 + r() * 20, offset: cliffSide * (CLEAR + PIECE_DEPTH[cliff] * cliffScale + 15 + r() * 40), y: SEA, yaw: ALONG_ROAD, scale: cliffScale });
  const rocks = 2 + Math.floor(r() * 2);
  for (let i = 0; i < rocks; i++) {
    const piece: CoastPiece = r() < .5 ? 'rock_a' : 'rock_b', scale = 2.5 + r() * 2.5;
    out.push({ piece, along: r() * COAST_CHUNK_METRES, offset: side() * (CLEAR + PIECE_DEPTH[piece] * scale + r() * 25), y: SEA - .15 * scale - r() * .1 * scale, yaw: r() * Math.PI * 2, scale });
  }
  if (r() < .6) { // palm islet: a broad rock with a palm rooted just below its crown
    const palm: CoastPiece = r() < .5 ? 'palm_a' : 'palm_b', rockScale = 4 + r(), palmScale = .9 + r() * .3;
    const offset = side() * (CLEAR + Math.max(PIECE_DEPTH.rock_a * rockScale, PIECE_DEPTH[palm] * palmScale) + 3 + r() * 15);
    const along = 10 + r() * 100, yaw = r() * Math.PI * 2;
    out.push({ piece: 'rock_a', along, offset, y: SEA - .15 * rockScale, yaw, scale: rockScale });
    out.push({ piece: palm, along, offset, y: SEA + .88 * rockScale, yaw, scale: palmScale });
  }
  if (r() < .18) { // sea arch out on the water, opposite the cliff, sunk so its open base stays below the sea
    const scale = .9 + r() * .3;
    out.push({ piece: 'sea_arch', along: 40 + r() * 40, offset: -cliffSide * (90 + r() * 60), y: SEA - 4, yaw: ALONG_ROAD, scale });
  }
  return out;
}

export interface ChunkWindow { first: number; count: number }
/** One chunk behind the car, AHEAD chunks in front; Low draws no GLB scenery. */
export function coastChunkWindow(distance: number, quality: VfxQuality): ChunkWindow | null {
  if (quality === 'low') return null;
  return { first: Math.floor(distance / COAST_CHUNK_METRES) - 1, count: 2 + AHEAD[quality] };
}

interface Part { mesh: THREE.InstancedMesh; locals: THREE.Matrix4[]; used: number }

/** Pools sized for the largest window; spare instances are parked far below the scene (never zero scale). */
export function createCoastModelLayer(source: THREE.Object3D) {
  source.updateMatrixWorld(true);
  const rootInverse = source.matrixWorld.clone().invert();
  const parts = new Map<CoastPiece, Part[]>();
  const meshes: THREE.InstancedMesh[] = [];
  const parked = new THREE.Matrix4().makeTranslation(0, -1000, 0);
  for (const piece of COAST_PIECES) {
    const root = source.getObjectByName(piece);
    if (!root) throw new Error(`coast-scenery: missing node ${piece}`);
    const byKey = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; locals: THREE.Matrix4[] }>();
    root.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const key = mesh.geometry.uuid + [mesh.material].flat().map(m => m.uuid).join();
      const entry = byKey.get(key) ?? { geometry: mesh.geometry, material: mesh.material, locals: [] };
      entry.locals.push(rootInverse.clone().multiply(mesh.matrixWorld));
      byKey.set(key, entry);
    });
    const list: Part[] = [...byKey.values()].map(({ geometry, material, locals }, k) => {
      const capacity = MAX_PER_CHUNK[piece] * MAX_CHUNKS * locals.length;
      const mesh = new THREE.InstancedMesh(geometry, material, capacity);
      mesh.name = k ? `${piece}:${k}` : piece;
      mesh.frustumCulled = false; // instances span the whole window; the pool's bounds would be stale
      for (let i = 0; i < capacity; i++) mesh.setMatrixAt(i, parked);
      meshes.push(mesh);
      return { mesh, locals, used: 0 };
    });
    parts.set(piece, list);
  }
  const transform = new THREE.Matrix4(), part = new THREE.Matrix4();
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = THREE.Object3D.DEFAULT_UP;
  let key = '', previousRoute: ClassicRoad | undefined;
  return {
    meshes,
    /** Rewrites every instance for the chunk window; a no-op unless the window, origin or seed changed. */
    place(route: ClassicRoad, window: ChunkWindow, origin: number, seed?: number): void {
      const next = `${window.first}|${window.count}|${origin}|${seed}`;
      if (next === key && route === previousRoute) return;
      key = next; previousRoute = route;
      for (const list of parts.values()) for (const entry of list) entry.used = 0;
      for (let chunk = window.first; chunk < window.first + window.count; chunk++) {
        for (const placement of coastChunkPlan(chunk, seed)) {
          if (placement.piece === 'guard_rail' && chunk >= window.first + RAIL_CHUNKS) continue;
          const distance = chunk * COAST_CHUNK_METRES + placement.along;
          if (placement.piece === 'guard_rail') {
            const [ax, az] = route.point(distance - RAIL_LENGTH / 2, placement.offset);
            const [bx, bz] = route.point(distance + RAIL_LENGTH / 2, placement.offset);
            p.set((ax + bx) / 2, placement.y, (az + bz) / 2 + origin);
            q.setFromAxisAngle(up, Math.atan2(az - bz, bx - ax));
            s.set(Math.hypot(bx - ax, bz - az) / RAIL_LENGTH, 1, 1);
          } else {
            const [x, z] = route.point(distance, placement.offset);
            p.set(x, placement.y, z + origin);
            q.setFromAxisAngle(up, placement.yaw - route.heading(distance));
            s.setScalar(placement.scale);
          }
          transform.compose(p, q, s);
          for (const entry of parts.get(placement.piece)!) for (const local of entry.locals) {
            if (entry.used < entry.mesh.instanceMatrix.count) entry.mesh.setMatrixAt(entry.used++, part.multiplyMatrices(transform, local));
          }
        }
      }
      for (const list of parts.values()) for (const { mesh, used } of list) {
        for (let i = used; i < mesh.count; i++) mesh.setMatrixAt(i, parked);
        mesh.count = used;
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
    /** Frees the instance buffers only; geometry and materials belong to the model cache handle. */
    dispose(): void { for (const mesh of meshes) { mesh.removeFromParent(); mesh.dispose(); } },
  };
}
export type CoastModelLayer = ReturnType<typeof createCoastModelLayer>;
