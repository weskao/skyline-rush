import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Static opaque meshes only: transparency and explicit render order depend on
// independent depth sorting. The batch must also preserve shadow/layer flags.
function canBatch(mesh: THREE.Mesh): boolean {
  const material = mesh.material;
  return !!mesh.geometry && !!material && !Array.isArray(material) &&
    !material.transparent && material.depthWrite &&
    mesh.renderOrder === 0 && !mesh.userData.ownGeometry &&
    !mesh.userData.dynamic && mesh.userData.static !== false &&
    !(mesh instanceof THREE.SkinnedMesh) &&
    !(mesh instanceof THREE.InstancedMesh && !!mesh.instanceColor) &&
    !(mesh.morphTargetInfluences?.length);
}
const appearanceKey = (mesh: THREE.Mesh, material = mesh.material as THREE.Material): string =>
  [mesh.geometry.uuid, material.uuid, !!mesh.userData.tintable,
    mesh.castShadow, mesh.receiveShadow, mesh.layers.mask, mesh.frustumCulled].join('|');
// A colour-only variant (kit material with a white `tintBase` twin) of a `tintable` part pools by
// its base, so meshes differing only in colour share one draw. Pulsing colours and mutated sides
// keep their material.
function tintBase(mesh: THREE.Mesh): THREE.Material | null {
  const material = mesh.material as THREE.Material;
  const base = material.userData.tintBase as THREE.Material | undefined;
  return base && mesh.userData.tintable && !material.userData.pulse && material.side === base.side ? base : null;
}
// Three sorts opaque draws by material id, so a depth tie between touching parts went to the later
// colour. A shared tinted draw keeps that order only among its own instances (sorted by material id
// in poolStaticChunks), so a part is tintable only when every part it touches has its geometry and
// tint base. `reach` covers far depth-buffer steps (near 0.1 m: about 0.21 m at 600 m).
export function tintableParts(parts: THREE.Object3D[], reach = 0.25): boolean[] {
  const boxes = parts.map(part => new THREE.Box3().setFromObject(part).expandByScalar(reach / 2));
  const drawOf = (part: THREE.Object3D, i: number) => {
    const mesh = part as THREE.Mesh, base = (mesh.material as THREE.Material | undefined)?.userData.tintBase;
    return mesh.isMesh && base ? mesh.geometry.uuid + base.uuid : 'own ' + i;
  };
  const root = parts.map((_, i) => i);
  const find = (i: number): number => root[i] === i ? i : (root[i] = find(root[i]));
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++)
    if (boxes[i].intersectsBox(boxes[j])) root[find(i)] = find(j);
  const draw = new Map<number, string | null>();
  parts.forEach((part, i) => {
    const r = find(i), key = drawOf(part, i);
    draw.set(r, draw.has(r) && draw.get(r) !== key ? null : key);
  });
  return parts.map((part, i) => !drawOf(part, i).startsWith('own') && draw.get(find(i)) !== null);
}
function preserveRenderState(batch: THREE.Mesh, source: THREE.Mesh): void {
  batch.castShadow = source.castShadow;
  batch.receiveShadow = source.receiveShadow;
  batch.layers.mask = source.layers.mask;
  batch.frustumCulled = source.frustumCulled;
}

// GPU-instancing equal-geometry + equal-material meshes preserves every
// triangle, normal and authored material. Every static 120 m chunk is batched
// once; during driving only the chunk parent transforms move.
export function batchStaticChunk(chunk: THREE.Group, minimumInstances = 3) {
  chunk.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(chunk.matrixWorld).invert();
  const groups = new Map<string, Array<THREE.Mesh<THREE.BufferGeometry, THREE.Material>>>();
  chunk.traverse(object => {
    // Three.js Mesh flags are runtime sentinels (and Object3D does not declare them).
    if (!('isMesh' in object) || object.isMesh !== true ||
        ('isInstancedMesh' in object && object.isInstancedMesh === true)) return;
    const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
    if(!canBatch(mesh))return;
    const key=appearanceKey(mesh);
    const existing = groups.get(key);
    if (existing) existing.push(mesh);
    else groups.set(key, [mesh]);
  });
  let sourceMeshes=0,drawBatches=0;
  const reusableMatrix=new THREE.Matrix4();
  for(const meshes of groups.values()){
    if(meshes.length<minimumInstances)continue;
    const instances=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);
    instances.name='scenery instance batch';
    preserveRenderState(instances,meshes[0]);
    instances.userData.batchCount=meshes.length;
    instances.userData.tintable=meshes[0].userData.tintable;
    for(let i=0;i<meshes.length;i++){
      reusableMatrix.multiplyMatrices(inverse,meshes[i].matrixWorld);
      instances.setMatrixAt(i,reusableMatrix);
      const ancestor=meshes[i].parent;
      if(ancestor && 'isGroup' in ancestor && ancestor.isGroup === true) ancestor.userData.batched=true;
    }
    instances.instanceMatrix.needsUpdate=true;
    instances.computeBoundingSphere();
    chunk.add(instances);
    for(const mesh of meshes)mesh.removeFromParent();
    sourceMeshes+=meshes.length;
    drawBatches++;
  }
  return {sourceMeshes,drawBatches,trianglesPreserved:true};
}

// Pool static drawables from multiple 120m chunks by shared geometry/material.
// Only rebuild when the streamed set changes; keep the source tree for probes.
export function releaseStaticPool(pool: THREE.Group | null | undefined): void {
  if (!pool) return;
  for (const source of pool.userData.sources as THREE.Mesh[]) source.visible = true;
  for (const child of pool.children) if (child instanceof THREE.InstancedMesh) child.dispose();
  pool.removeFromParent();
}
export function poolStaticChunks(
  layer: THREE.Group,
  chunks: Iterable<THREE.Group>,
  previous: THREE.Group | null = null,
  maxChunkSpan = Number.POSITIVE_INFINITY,
): THREE.Group {
  releaseStaticPool(previous);
  layer.updateWorldMatrix(true, false);
  const inverse = layer.matrixWorld.clone().invert();
  const groups = new Map<string, THREE.Mesh[]>();
  let chunkOrdinal = 0;
  for (const chunk of chunks) {
    const chunkIndex = Number.isInteger(chunk.userData.chunkIndex)
      ? chunk.userData.chunkIndex as number : chunkOrdinal;
    chunkOrdinal++;
    // Keep cross-chunk pools spatially bounded: a single far-reaching
    // InstancedMesh defeats per-chunk frustum culling on narrow viewports.
    const bucket = Number.isFinite(maxChunkSpan) && maxChunkSpan > 0
      ? Math.floor(chunkIndex / maxChunkSpan) : 0;
    chunk.updateWorldMatrix(true, true);
    chunk.traverse(object => {
      if (!('isMesh' in object) || object.isMesh !== true ||
          !object.visible || object.userData.ownGeometry) return;
      const mesh = object as THREE.Mesh;
      if (!canBatch(mesh)) return;
      const key = bucket + '|' + appearanceKey(mesh, tintBase(mesh) ?? mesh.material as THREE.Material);
      const list = groups.get(key);
      if (list) list.push(mesh);
      else groups.set(key, [mesh]);
    });
  }
  const pool = new THREE.Group();
  pool.name = 'World Tour shared draw batches';
  const sources: THREE.Mesh[] = [];
  let drawsSaved = 0;
  const instance = new THREE.Matrix4(), combined = new THREE.Matrix4(), local = new THREE.Matrix4();
  for (const [key, meshes] of groups) {
    if (meshes.length < 2) continue; // A lone source gains nothing.
    const total = meshes.reduce((n, mesh) =>
      n + (mesh instanceof THREE.InstancedMesh ? mesh.count : 1), 0);
    if (!total) continue;
    const first = meshes[0], firstMaterial = first.material as THREE.Material;
    // One colour keeps its own material (no extra program); several share the white base.
    const tinted = meshes.some(mesh => mesh.material !== firstMaterial);
    const batch = new THREE.InstancedMesh(first.geometry,
      tinted ? tintBase(first)! : firstMaterial, total);
    // Stable: equal colours keep their source order, colours draw in their old material order.
    // (three's typings omit Material.id, the key its opaque sort uses.)
    const id = (mesh: THREE.Mesh) => (mesh.material as THREE.Material & { id: number }).id;
    if (tinted) meshes.sort((a, b) => id(a) - id(b));
    batch.name = 'scenery shared GPU batch';
    batch.userData.bucket = Number(key.slice(0, key.indexOf('|')));
    preserveRenderState(batch,first);
    let at = 0;
    for (const mesh of meshes) {
      local.multiplyMatrices(inverse,mesh.matrixWorld);
      const count = mesh instanceof THREE.InstancedMesh ? mesh.count : 1;
      for (let i = 0; i < count; i++) {
        if (mesh instanceof THREE.InstancedMesh) mesh.getMatrixAt(i, instance);
        else instance.identity();
        if (tinted) batch.setColorAt(at, (mesh.material as THREE.MeshBasicMaterial).color);
        batch.setMatrixAt(at++, combined.multiplyMatrices(local, instance));
      }
      mesh.visible = false;
      sources.push(mesh);
    }
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    pool.add(batch);
    drawsSaved += meshes.length - 1;
  }
  pool.userData.sources = sources;
  pool.userData.drawsSaved = drawsSaved;
  layer.add(pool);
  return pool;
}

// Static merge for one authored object (a landmark): equal-appearance meshes
// become one mesh whose vertices are baked into the root's local space. The
// world-space vertex set, materials and flags stay identical, so vertex-based
// framing/inspection and raycasts see the same silhouette. Mirrored meshes are
// skipped (baking a negative determinant would flip face winding).
export function mergeStaticMeshes(root: THREE.Object3D, minimumMeshes = 2): number {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(), local = new THREE.Matrix4();
  const groups = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>();
  root.traverse(object => {
    if (!('isMesh' in object) || object.isMesh !== true || 'isInstancedMesh' in object) return;
    const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
    if (!canBatch(mesh) || mesh.matrixWorld.determinant() <= 0) return;
    const key = appearanceKey(mesh).replace(mesh.geometry.uuid, mesh.geometry.index ? 'indexed' : 'plain');
    const list = groups.get(key);
    if (list) list.push(mesh); else groups.set(key, [mesh]);
  });
  let removed = 0;
  for (const meshes of groups.values()) {
    if (meshes.length < minimumMeshes) continue;
    const baked = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(local.multiplyMatrices(inverse, mesh.matrixWorld)));
    const geometry = mergeGeometries(baked);
    for (const part of baked) part.dispose();
    if (!geometry) continue; // Incompatible attribute sets stay as separate draws.
    const merged = new THREE.Mesh(geometry, meshes[0].material);
    merged.name = 'static merged mesh';
    preserveRenderState(merged, meshes[0]);
    merged.userData.ownGeometry = true;
    merged.userData.mergedCount = meshes.length;
    root.add(merged);
    for (const mesh of meshes) mesh.removeFromParent();
    removed += meshes.length - 1;
  }
  return removed;
}
