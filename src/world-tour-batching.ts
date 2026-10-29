import * as THREE from 'three';

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
const appearanceKey = (mesh: THREE.Mesh): string =>
  [mesh.geometry.uuid, (mesh.material as THREE.Material).uuid,
    mesh.castShadow, mesh.receiveShadow, mesh.layers.mask, mesh.frustumCulled].join('|');
function preserveRenderState(batch: THREE.InstancedMesh, source: THREE.Mesh): void {
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
  const transforms: THREE.Matrix4[]=[];
  for(const meshes of groups.values()){
    if(meshes.length<minimumInstances)continue;
    const instances=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);
    instances.name='scenery instance batch';
    preserveRenderState(instances,meshes[0]);
    instances.userData.batchCount=meshes.length;
    for(let i=0;i<meshes.length;i++){
      const matrix=new THREE.Matrix4().multiplyMatrices(inverse,meshes[i].matrixWorld);
      instances.setMatrixAt(i,matrix);
      transforms.push(matrix);
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
      const key = bucket + '|' + appearanceKey(mesh);
      const list = groups.get(key);
      if (list) list.push(mesh);
      else groups.set(key, [mesh]);
    });
  }
  const pool = new THREE.Group();
  pool.name = 'World Tour shared draw batches';
  const sources: THREE.Mesh[] = [];
  let drawsSaved = 0;
  const instance = new THREE.Matrix4(), combined = new THREE.Matrix4();
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue; // A lone source gains nothing.
    const total = meshes.reduce((n, mesh) =>
      n + (mesh instanceof THREE.InstancedMesh ? mesh.count : 1), 0);
    if (!total) continue;
    const first = meshes[0];
    const batch = new THREE.InstancedMesh(first.geometry, first.material, total);
    batch.name = 'scenery shared GPU batch';
    preserveRenderState(batch,first);
    let at = 0;
    for (const mesh of meshes) {
      const local = inverse.clone().multiply(mesh.matrixWorld);
      const count = mesh instanceof THREE.InstancedMesh ? mesh.count : 1;
      for (let i = 0; i < count; i++) {
        if (mesh instanceof THREE.InstancedMesh) mesh.getMatrixAt(i, instance);
        else instance.identity();
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
