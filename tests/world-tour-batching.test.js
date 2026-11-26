import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStaticChunk } from '../src/world-tour-batching.ts';
import * as batching from '../src/world-tour-batching.ts';
import { createWorldTourScene } from '../src/world-tour-scene.js';
import { RACE_TRACKS } from '../src/game.js';

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
 assert.notEqual(batch.material,mat,'the batch draws with its own copy: see the twin test below');
 assert.equal(batch.material.type,mat.type);
 assert.ok(batch.material.color.equals(mat.color)&&batch.material.roughness===mat.roughness);
 const temp=new THREE.Matrix4();
 for(let i=0;i<16;i++){
   batch.getMatrixAt(i,temp);
   assert.ok(temp.elements.every((x,k)=>Math.abs(x-expected[i].elements[k])<1e-6),String(i));
 }
 assert.ok(group.children.some(x=>x.userData.batched));
});
test('an instanced batch never shares a material with a plain mesh, except one that is animated per frame',()=>{
 // three keeps one instancing flag per material: a plain mesh and a batch on the same material make each other
 // re-look-up the program on every frame (taipei racing: 34 lookups per frame).
 const geometry=new THREE.BoxGeometry(1,1,1),shared=new THREE.MeshStandardMaterial({color:'#637877'});
 const pulse=new THREE.MeshStandardMaterial({color:'#ff00aa'});pulse.userData.pulse='beacon';
 const group=new THREE.Group(),lone=new THREE.Mesh(new THREE.SphereGeometry(1),shared);
 group.add(lone);
 const pulseGeometry=new THREE.BoxGeometry(2,2,2);
 // one geometry per material, so each material forms its own batch
 for(const [material,shape] of [[shared,geometry],[pulse,pulseGeometry]])for(let i=0;i<4;i++){const mesh=new THREE.Mesh(shape,material);mesh.position.set(i*3,0,0);group.add(mesh);}
 group.updateMatrixWorld(true);
 assert.equal(batchStaticChunk(group,3).drawBatches,2);
 const batches=group.children.filter(o=>o.isInstancedMesh);
 const sharedBatch=batches.find(b=>b.geometry===geometry),pulseBatch=batches.find(b=>b!==sharedBatch);
 assert.equal(lone.material,shared,'the plain mesh keeps the authored material');
 assert.notEqual(sharedBatch.material,shared,'the batch has its own copy');
 assert.equal(pulseBatch.material,pulse,'a material written every frame stays shared so every copy follows it');
 let twinDisposed=0;sharedBatch.material.addEventListener('dispose',()=>twinDisposed++);
 shared.dispose();
 assert.equal(twinDisposed,1,'disposing the authored material releases its copy, so a track change leaves no GPU program behind');
});
test('unique road and terrain meshes are left untouched',()=>{
 const chunk=new THREE.Group();
 const road=new THREE.Mesh(new THREE.BoxGeometry(4,1,120),new THREE.MeshBasicMaterial());
 road.userData.ownGeometry=true;chunk.add(road);
 const stats=batchStaticChunk(chunk);
 assert.equal(stats.drawBatches,0);
 assert.ok(chunk.children.includes(road));
});
const awaitStaticPool=(...args)=>batching.poolStaticChunks?.(...args);
const releaseStaticPool=(...args)=>batching.releaseStaticPool?.(...args);

test('static meshes shared across streamed chunks collapse to one draw without changing transforms',()=>{
 const chunks=[],geometry=new THREE.BoxGeometry(1,1,1);
 const material=new THREE.MeshStandardMaterial({color:'#507786'});
 const scene=new THREE.Group(),layer=new THREE.Group();scene.add(layer);
 layer.position.set(-900,-10,150);
 for(let i=0;i<5;i++){
   const chunk=new THREE.Group();chunk.name='world-tour-tokyo-chunk-'+i;
   const prop=new THREE.Mesh(geometry,material);
   prop.position.set(i*120,4,-i*120);
   chunk.add(prop);layer.add(chunk);chunks.push(chunk);
 }
 const terrain=new THREE.Mesh(new THREE.PlaneGeometry(120,120),material);
 terrain.userData.ownGeometry=true;chunks[0].add(terrain);
 scene.updateMatrixWorld(true);
 const expected=chunks.map(chunk=>chunk.children[0].matrixWorld.clone());
 // Current code draws five meshes with identical materials separately.
 const before=chunks.flatMap(chunk=>chunk.children).filter(m=>m.visible&&m.isMesh).length;
 const pooled=awaitStaticPool(layer,chunks);
 assert.ok(pooled, 'cross-chunk GPU instance pool is required');
 assert.equal(pooled.userData.drawsSaved,4);
 assert.equal(pooled.children.length,1);
 const batch=pooled.children[0];
 assert.equal(batch.count,5);
 assert.ok(chunks.every(chunk=>!chunk.children[0].visible),'originals remain in the scene for layout/clearance probes');
 assert.equal(terrain.visible,true,'unique owned terrain stays drawn');
 const matrix=new THREE.Matrix4(),world=new THREE.Matrix4();
 for(let i=0;i<5;i++){
   batch.getMatrixAt(i,matrix);
   world.multiplyMatrices(layer.matrixWorld,matrix);
   assert.ok(world.elements.every((x,j)=>Math.abs(x-expected[i].elements[j])<.0001));
 }
 const again=awaitStaticPool(layer,chunks,pooled);
 assert.equal(again.children.length,1,'rebuild does not leak pooled draws');
 assert.equal(again.userData.drawsSaved,4);
 releaseStaticPool(again);
 assert.ok(chunks.every(chunk=>chunk.children[0].visible),'disposing pool restores original drawables');
 assert.equal(before,6);
 geometry.dispose();terrain.geometry.dispose();material.dispose();
});

test('real World Tour medium chunks reuse shared GPU material batches across boundaries',()=>{
 const scene=new THREE.Scene(),renderer=createWorldTourScene(scene);
 try {
   for(const id of ['tokyo','alpine','taipei','coastal','cosmic']){
     renderer.update(id,1550,'medium',RACE_TRACKS[id].sections,0,true);
     const layer=scene.getObjectByName('Distance-anchored continuous scenery');
     const pooled=layer.getObjectByName('World Tour shared draw batches');
     assert.ok(pooled,id+' must pool chunks');
     assert.ok(pooled.userData.drawsSaved>=60,id+' should remove >=60 repeated static draw submissions');
     const first=pooled;
     renderer.update(id,1551,'medium',RACE_TRACKS[id].sections,.03,true);
     assert.equal(layer.getObjectByName('World Tour shared draw batches'),first,'no per-frame batch rebuild');
   }
 }finally{renderer.dispose();}
});
