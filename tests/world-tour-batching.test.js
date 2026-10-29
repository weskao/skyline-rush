import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStaticChunk } from '../src/world-tour-batching.ts';

test('identical static meshes are instanced without moving any original vertex or removing detail',()=>{
 const group=new THREE.Group(),stem=new THREE.BoxGeometry(1,1,1);
 const mat=new THREE.MeshStandardMaterial({color:'#637877',roughness:.84});
 const expected=[];
 for(let i=0;i<16;i++){
   const parent=new THREE.Group();
   parent.position.set(i*7,0,-i*11);
   const mesh=new THREE.Mesh(stem,mat);
   mesh.scale.set(1+i*.12,2+i*.08,1);
   mesh.position.set(0,2,0);
   parent.add(mesh);group.add(parent);
   parent.updateMatrixWorld(true);
   expected.push(mesh.matrixWorld.clone());
 }
 const stats=batchStaticChunk(group);
 assert.equal(stats.sourceMeshes,16);
 assert.equal(stats.drawBatches,1);
 const batch=group.children.find(child=>child.isInstancedMesh);
 assert.equal(batch.count,16);
 assert.equal(batch.geometry,stem);
 assert.equal(batch.material,mat);
 const temp=new THREE.Matrix4();
 for(let i=0;i<16;i++){
   batch.getMatrixAt(i,temp);
   assert.ok(temp.elements.every((x,k)=>Math.abs(x-expected[i].elements[k])<1e-6),String(i));
 }
 assert.ok(group.children.some(x=>x.userData.batched));
});
test('unique road and terrain meshes are left untouched',()=>{
 const chunk=new THREE.Group();
 const road=new THREE.Mesh(new THREE.BoxGeometry(4,1,120),new THREE.MeshBasicMaterial());
 road.userData.ownGeometry=true;chunk.add(road);
 const stats=batchStaticChunk(chunk);
 assert.equal(stats.drawBatches,0);
 assert.ok(chunk.children.includes(road));
});
