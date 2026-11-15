// Task 5b steps 5 to 7: draws the Neon Downtown kits (neon-city.glb, neon-landmarks.glb) where neon-scenery-plan.ts
// puts them. One InstancedMesh per piece and LOD band; matrices are rewritten only when the chunk window, route or
// seed changes. The model cache handle owns the GLB geometry and materials; this layer owns its pools and the ground.
import * as THREE from 'three';
import type { ClassicRoad } from './classic-road-routes.ts';
import { NEON_CHUNK_METRES, NEON_GROUND, NEON_LAP, NEON_MAX_CHUNKS, NEON_PIECES, NEON_SHORE, NEON_TILE, neonChunkPlan, neonChunkWindow, type NeonKit, type NeonPiece, type NeonPlacement } from './neon-scenery-plan.ts';
import { REFLECT_LAYER } from './wet-reflection.ts';
import type { VfxQuality } from './vfx-settings.ts';

const PARKED = new THREE.Matrix4().makeTranslation(0, -1000, 0);
/** emissiveIntensity under the Neon race bloom (nightRain, threshold 0.9). The GLBs carry their offline-render
 *  strengths (city 6, landmarks 1 to 3), which clip to white. Each kit's neon tubes stay above the threshold so they
 *  glow, and its brightest texel (a blade sign, the cyan parapet band) within twice it, so the street fronts and the
 *  centre sightline keep their colour (tests/neon-scenery.test.js, *kit emissive*). */
const EMISSIVE: Record<NeonKit, number> = { city: 1.7, landmarks: 1.5 };
/** A far tower is left out when it would stand this close to another part of the loop (skyline-scenery.ts CLEAR). */
const CLEAR = 64, FAR_OFFSET = 100;

interface Pool { mesh: THREE.InstancedMesh; local: THREE.Matrix4 }
interface Bands { near: Pool; far: Pool | null }

/** Pools sized for the largest window; spare instances are parked far below the scene (never zero scale). */
function createKitPools(source: THREE.Object3D, kit: NeonKit) {
  source.updateMatrixWorld(true);
  const rootInverse = source.matrixWorld.clone().invert(), meshes: THREE.InstancedMesh[] = [], bands = new Map<NeonPiece, Bands>();
  const pool = (piece: NeonPiece, lod: number, capacity: number, band: string, mirrored: boolean): Pool => {
    const lodMesh = source.getObjectByName(`${piece}_lod${lod}`) as THREE.Mesh | undefined;
    if (!lodMesh?.isMesh) throw new Error(`neon-${kit}: missing mesh ${piece}_lod${lod}`);
    const mesh = new THREE.InstancedMesh(lodMesh.geometry, lodMesh.material, capacity);
    mesh.name = `${piece}:${band}`;
    mesh.frustumCulled = false; // instances span the whole window; the pool's bounds would be stale
    // Step 4: what glows beside the car shows in the wet road (the lights-only pass of wet-reflection.ts).
    if (mirrored) mesh.layers.enable(REFLECT_LAYER);
    for (let i = 0; i < capacity; i++) mesh.setMatrixAt(i, PARKED);
    mesh.count = 0;
    meshes.push(mesh);
    return { mesh, local: rootInverse.clone().multiply(lodMesh.matrixWorld) };
  };
  for (const piece of Object.keys(NEON_PIECES) as NeonPiece[]) {
    const spec = NEON_PIECES[piece];
    if (spec.kit !== kit) continue;
    const nearChunks = Math.min(NEON_MAX_CHUNKS, 2 + spec.near), farChunks = spec.far ? NEON_MAX_CHUNKS - nearChunks : 0;
    bands.set(piece, { near: pool(piece, 0, spec.cap * nearChunks, 'near', spec.mirror), far: farChunks ? pool(piece, spec.lods - 1, spec.cap * farChunks, 'far', false) : null });
  }
  for (const { material } of meshes) (material as THREE.MeshStandardMaterial).emissiveIntensity = EMISSIVE[kit];
  return {
    meshes, bands,
    /** Frees the instance buffers only. */
    dispose(): void { for (const mesh of meshes) { mesh.removeFromParent(); mesh.dispose(); } },
  };
}

/** The land of the city sectors: a strip each side of the road from the far quay line round to the near one, with a
 *  wall down into the canal along its outer edges and across both ends. One draw. */
function groundGeometry(route: ClassicRoad): THREE.BufferGeometry {
  const { inner, reach, y, depth, tile } = NEON_GROUND, STEP = 16, from = NEON_SHORE[1], length = NEON_LAP - from + NEON_SHORE[0];
  const rows = Math.ceil(length / STEP), across = [-reach, -reach, -inner, inner, reach, reach], positions: number[] = [], uvs: number[] = [], index: number[] = [];
  // Planar UVs, one pavement tile per `tile` metres; a wall vertex is pushed one wall height along u so it is not a smear.
  const vertex = (x: number, z: number, wall: boolean): void => { positions.push(x, wall ? y - depth : y, z); uvs.push((x + (wall ? depth : 0)) / tile, z / tile); };
  for (let row = 0; row <= rows; row++) {
    const lap = from + Math.min(length, row * STEP);
    across.forEach((offset, k) => { const [x, z] = route.point(lap, offset); vertex(x, z, k === 0 || k === 5); });
    if (!row) continue;
    for (const k of [0, 1, 3, 4]) { // wall, land, (the road), land, wall
      const a = (row - 1) * 6 + k, b = a + 6;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  for (const row of [0, rows]) { // the quay across each end, under the bridge deck too
    const top = row * 6 + 1, base = positions.length / 3;
    for (const k of [0, 3]) vertex(positions[(top + k) * 3]!, positions[(top + k) * 3 + 2]!, true);
    index.push(top, top + 3, base, base, top + 3, base + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export function createNeonScenery(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.name = 'Neon Downtown kit';
  group.visible = false;
  scene.add(group);
  const kits: Partial<Record<NeonKit, ReturnType<typeof createKitPools>>> = {};
  // Bare dark paving until the asset host lays the look's KTX2 pavement set (`pave`), and when that set cannot load.
  const bare = new THREE.MeshStandardMaterial({ color: '#0d1118', roughness: .6, side: THREE.DoubleSide });
  const ground = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(new THREE.BufferGeometry(), bare);
  ground.name = 'Neon ground';
  ground.frustumCulled = false;
  group.add(ground);
  const transform = new THREE.Matrix4(), matrix = new THREE.Matrix4();
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = THREE.Object3D.DEFAULT_UP;
  let first = NaN, count = 0, placedSeed: number | undefined, placedRoute: ClassicRoad | undefined, stale = true;

  /** Composes `transform` for one placement; false when a far tower would stand on another part of the loop. */
  function stand(route: ClassicRoad, placement: NeonPlacement, distance: number): boolean {
    const tile = placement.span === undefined ? undefined : NEON_TILE[placement.piece];
    if (tile) { // from where the last tile ended to where the next begins, on the tile's own line
      const [ax, az] = route.point(distance - placement.span! / 2, placement.offset), [bx, bz] = route.point(distance + placement.span! / 2, placement.offset);
      const stretch = Math.hypot(bx - ax, bz - az) / tile.length;
      p.set((ax + bx) / 2, placement.y, (az + bz) / 2);
      q.setFromAxisAngle(up, placement.yaw - Math.atan2(bx - ax, az - bz));
      s.set(tile.axis === 'x' ? stretch : 1, 1, tile.axis === 'z' ? stretch : 1);
    } else {
      const [x, z] = route.point(distance, placement.offset);
      if (Math.abs(placement.offset) > FAR_OFFSET && route.offset(x, z, CLEAR) < CLEAR) return false;
      p.set(x, placement.y, z);
      q.setFromAxisAngle(up, placement.yaw - route.heading(distance));
      s.setScalar(1);
    }
    transform.compose(p, q, s);
    return true;
  }

  function place(route: ClassicRoad, seed?: number): void {
    for (const kit of Object.values(kits)) for (const mesh of kit.meshes) mesh.userData.used = 0;
    for (let chunk = first; chunk < first + count; chunk++) for (const placement of neonChunkPlan(chunk, seed)) {
      const spec = NEON_PIECES[placement.piece], bands = kits[spec.kit]?.bands.get(placement.piece), close = chunk - first - 1 <= spec.near;
      if (!bands || !close && !spec.far || !stand(route, placement, chunk * NEON_CHUNK_METRES + placement.along)) continue;
      const { mesh, local } = close ? bands.near : bands.far!;
      if (mesh.userData.used < mesh.instanceMatrix.count) mesh.setMatrixAt(mesh.userData.used++, matrix.multiplyMatrices(transform, local));
    }
    for (const kit of Object.values(kits)) for (const mesh of kit.meshes) {
      for (let i = mesh.userData.used; i < mesh.count; i++) mesh.setMatrixAt(i, PARKED);
      mesh.count = mesh.userData.used;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    group,
    /** Draws a parsed kit GLB; the caller (the model cache handle) keeps ownership of its geometry and materials. */
    attachKit(kit: NeonKit, source: THREE.Object3D): void {
      kits[kit]?.dispose();
      const pools = kits[kit] = createKitPools(source, kit);
      for (const mesh of pools.meshes) group.add(mesh);
      stale = true;
    },
    detachKit(kit: NeonKit): void { kits[kit]?.dispose(); delete kits[kit]; },
    /** Puts the caller's pavement material on the land (the caller frees it); null brings the bare paving back. */
    pave(material: THREE.Material | null): void {
      if (material) { material.side = THREE.DoubleSide; material.name = 'neon_pavement'; } // the quay wall is seen from the water
      ground.material = material ?? bare;
    },
    /** Per frame. Low draws nothing: the caller keeps the procedural city there. */
    update(route: ClassicRoad, distance: number, quality: VfxQuality, seed?: number): void {
      const window = neonChunkWindow(distance, quality);
      group.visible = !!window;
      if (!window || !Number.isFinite(distance)) return;
      const [x, z] = route.point(distance);
      group.position.set(-x, 0, -z);
      if (route !== placedRoute) { ground.geometry.dispose(); ground.geometry = groundGeometry(route); }
      if (!stale && window.first === first && window.count === count && seed === placedSeed && route === placedRoute) return;
      first = window.first; count = window.count; placedSeed = seed; placedRoute = route; stale = false;
      place(route, seed);
    },
    hide(): void { group.visible = false; },
    dispose(): void {
      for (const kit of Object.values(kits)) kit.dispose();
      scene.remove(group);
      ground.geometry.dispose(); bare.dispose();
    },
  };
}
export type NeonScenery = ReturnType<typeof createNeonScenery>;
