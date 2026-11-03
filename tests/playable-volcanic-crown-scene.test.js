import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { volcanicEdgeLength, sampleVolcanicRoute } from '../src/courses/volcanic-crown.ts';
import { VOLCANIC_OBSTACLES, volcanicObstaclePose } from '../src/courses/volcanic-crown-obstacles.ts';
import { createVolcanicCrownChunk, VOLCANIC_CHUNK_METERS } from '../src/courses/volcanic-crown-scene.ts';

test('streamed ground is actual elevated 3D mesh with two basalt terrain skirts and lava',()=>{
  const {group,dispose}=createVolcanicCrownChunk('ground-2',2);
  const road=group.getObjectByName('physical-road');
  assert.ok(road.isMesh&&road.geometry.isBufferGeometry);
  const points=road.geometry.getAttribute('position');
  const heights=Array.from({length:points.count},(_,i)=>points.getY(i));
  assert.ok(Math.max(...heights)-Math.min(...heights)>2,'real elevation within a hairpin');
  assert.ok(group.getObjectByName('left-terrain'));
  assert.ok(group.getObjectByName('right-terrain'));
  assert.ok(group.getObjectByName('lava-river').material.isShaderMaterial);
  dispose();
});
test('actual falling-rock meshes share their physics pose and warning cycle',()=>{
  const rock=VOLCANIC_OBSTACLES.find(o=>o.kind==='rockfall');
  const chunk=Math.floor(rock.s/VOLCANIC_CHUNK_METERS);
  const {group,update,dispose}=createVolcanicCrownChunk(rock.edgeId,chunk,'low');
  const mesh=group.getObjectByName(rock.id);
  assert.ok(mesh.isMesh,'solid hazards never hidden at Low');
  update(1);
  assert.equal(mesh.visible,false);
  assert.equal(group.getObjectByName(rock.id+'-warning').visible,true);
  update(5.5);
  assert.equal(mesh.visible,true);
  const truth=volcanicObstaclePose(rock,5.5).point;
  assert.ok(mesh.position.distanceTo(new THREE.Vector3(...truth))<1e-6);
  dispose();
});
test('weather detail and real lava lighting respect Low/High and Reduced Motion',()=>{
  const low=createVolcanicCrownChunk('ground-5',0,'low');
  assert.equal(low.group.getObjectByName('volcanic-ash'),undefined);
  assert.equal(low.group.getObjectByName('heat-shimmer'),undefined);
  assert.ok(low.group.getObjectByName('lava-reflection-light').isPointLight);
  low.dispose();
  const high=createVolcanicCrownChunk('ground-5',0,'high');
  const ash=high.group.getObjectByName('volcanic-ash');
  const shimmer=high.group.getObjectByName('heat-shimmer');
  assert.ok(ash.isPoints&&shimmer.isMesh);
  high.update(3,true);
  assert.equal(ash.visible,false);assert.equal(shimmer.visible,false);
  high.update(3,false);
  assert.equal(ash.visible,true);assert.equal(shimmer.visible,true);
  high.dispose();
});
test('flight gap uses a guided world-space arc, not a fictional solid road',()=>{
  const {group,dispose}=createVolcanicCrownChunk('rift-flight',0,'medium');
  assert.ok(group.getObjectByName('aerial-route-guide').isMesh);
  assert.ok(group.getObjectByName('launch-pad').isMesh);
  assert.equal(group.getObjectByName('physical-road'),undefined);
  dispose();
});
test('signature crater and arch are 3D landmarks in their streamed route chunks',()=>{
  for(const [edge,ratio,name] of [['ground-4',.75,'volcano-crater'],['ground-7',.55,'basalt-arch']]){
    const index=Math.floor(volcanicEdgeLength(edge)*ratio/VOLCANIC_CHUNK_METERS);
    const {group,dispose}=createVolcanicCrownChunk(edge,index,'high');
    assert.ok(group.getObjectByName(name),name+' missing');
    const box=new THREE.Box3().setFromObject(group.getObjectByName(name));
    assert.ok(box.max.y-box.min.y>30,'landmark must be volumetric');
    dispose();
  }
});
test('scene material motion is quality- and reduced-motion-aware and GPU disposal is idempotent',()=>{
  const {group,update,dispose}=createVolcanicCrownChunk('ground-5',0,'high',false);
  const geometries=new Set(),materials=new Set();
  group.traverse(o=>{
    if(o.geometry)geometries.add(o.geometry);
    if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));
  });
  const lava=group.getObjectByName('lava-river').material;
  update(2,false);assert.equal(lava.uniforms.uTime.value,2);
  update(4,true);assert.equal(lava.uniforms.uTime.value,0);
  let ng=0,nm=0;
  for(const g of geometries)g.addEventListener('dispose',()=>ng++);
  for(const m of materials)m.addEventListener('dispose',()=>nm++);
  dispose();dispose();
  assert.equal(ng,geometries.size);assert.equal(nm,materials.size);
});
test('invalid chunk references cannot allocate resources',()=>{
  assert.throws(()=>createVolcanicCrownChunk('invalid',0),/Unknown/);
  assert.throws(()=>createVolcanicCrownChunk('ground-0',-1),RangeError);
  assert.throws(()=>createVolcanicCrownChunk('ground-0',999),RangeError);
  assert.ok(sampleVolcanicRoute('ground-0',0).point.every(Number.isFinite));
});
