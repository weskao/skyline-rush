import * as THREE from 'three';

// GPU-instancing equal-geometry + equal-material meshes preserves every
// triangle, normal and authored material. Every static 120 m chunk is batched
// once; during driving only the chunk parent transforms move.
export function batchStaticChunk(chunk, minimumInstances = 3) {
  chunk.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(chunk.matrixWorld).invert();
  const groups=new Map();
  chunk.traverse(mesh=>{
    if(!mesh.isMesh || mesh.isInstancedMesh || mesh.userData.ownGeometry ||
       !mesh.geometry || !mesh.material || Array.isArray(mesh.material))return;
    const key=mesh.geometry.uuid+'|'+mesh.material.uuid;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(mesh);
  });
  let sourceMeshes=0,drawBatches=0;
  const transforms=[];
  for(const meshes of groups.values()){
    if(meshes.length<minimumInstances)continue;
    const instances=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);
    instances.name='scenery instance batch';
    instances.userData.batchCount=meshes.length;
    for(let i=0;i<meshes.length;i++){
      const matrix=new THREE.Matrix4().multiplyMatrices(inverse,meshes[i].matrixWorld);
      instances.setMatrixAt(i,matrix);
      transforms.push(matrix);
      const ancestor=meshes[i].parent;
      if(ancestor?.isGroup)ancestor.userData.batched=true;
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
