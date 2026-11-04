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

test('every flight pad has safe world-frame placement and visible edge markings at every quality', () => {
  for (const edgeId of ['rift-flight', 'gorge-flight']) {
    const length = volcanicEdgeLength(edgeId);
    const lastChunk = Math.floor((length - 1e-6) / VOLCANIC_CHUNK_METERS);
    for (const [chunkIndex, name, s] of [[0, 'launch-pad', 0], [lastChunk, 'landing-pad', length]]) {
      for (const quality of ['low', 'medium', 'high']) {
        const chunk = createVolcanicCrownChunk(edgeId, chunkIndex, quality, true);
        const pad = chunk.group.getObjectByName(name);
        assert.ok(pad?.isMesh, `${edgeId} ${name} must exist at ${quality}`);
        assert.ok(pad.material.emissive.getHex() !== 0,
          `${edgeId} ${name} must remain visible without animated effects`);
        assert.equal(pad.children.filter(child => child.name === 'pad-edge-light').length, 2);
        const frame = sampleVolcanicRoute(edgeId, s);
        const expected = new THREE.Vector3(...frame.point)
          .addScaledVector(new THREE.Vector3(...frame.up), -.5);
        assert.ok(pad.position.distanceTo(expected) < 1e-4, `${edgeId} ${name} world frame`);
        chunk.dispose();
      }
    }
  }
});

test('fissure discs and warning rings follow the actual sloped road normal',()=>{
  for(const item of VOLCANIC_OBSTACLES.filter(o=>o.kind==='fissure'||o.kind==='vent'||o.kind==='rockfall')){
    const chunk=createVolcanicCrownChunk(item.edgeId,Math.floor(item.s/VOLCANIC_CHUNK_METERS),'low');
    chunk.update(5.5);
    const frame=sampleVolcanicRoute(item.edgeId,item.s);
    const up=new THREE.Vector3(...frame.up);
    const mesh=chunk.group.getObjectByName(item.id);
    if(item.kind==='fissure'||item.kind==='vent'){
      const discNormal=new THREE.Vector3(0,1,0).applyQuaternion(mesh.quaternion);
      assert.ok(discNormal.distanceTo(up)<1e-4,`${item.id} disc must follow its road plane`);
    }
    if(item.kind==='vent'||item.kind==='rockfall'){
      const ring=chunk.group.getObjectByName(item.id+'-warning');
      const ringNormal=new THREE.Vector3(0,0,1).applyQuaternion(ring.quaternion);
      assert.ok(ringNormal.distanceTo(up)<1e-4,`${item.id} warning ring tilt`);
      const ground=new THREE.Vector3(...sampleVolcanicRoute(item.edgeId,item.s).point)
        .addScaledVector(new THREE.Vector3(...frame.right),item.lateral)
        .addScaledVector(up,.12);
      assert.ok(ring.position.distanceTo(ground)<1e-3,`${item.id} warning ring alignment`);
    }
    chunk.dispose();
  }
});

test('Low and Medium hairpin meshes stay within 0.3 m of the sampled physical road',()=>{
  for(const edgeId of ['ground-2','ground-6']){
    const length=volcanicEdgeLength(edgeId);
    for(const quality of ['low','medium']){
      for(let chunkIndex=0;chunkIndex*VOLCANIC_CHUNK_METERS<length;chunkIndex++){
        const chunk=createVolcanicCrownChunk(edgeId,chunkIndex,quality);
        const position=chunk.group.getObjectByName('physical-road').geometry.getAttribute('position');
        const rows=position.count/2-1;
        const from=chunkIndex*VOLCANIC_CHUNK_METERS;
        const to=Math.min(length,from+VOLCANIC_CHUNK_METERS);
        for(let i=0;i<rows;i++){
          const center=new THREE.Vector3();
          for(const vertex of [2*i,2*i+1,2*i+2,2*i+3])
            center.add(new THREE.Vector3(position.getX(vertex),position.getY(vertex),position.getZ(vertex)));
          center.multiplyScalar(.25);
          const physical=new THREE.Vector3(...sampleVolcanicRoute(edgeId,from+(to-from)*(i+.5)/rows).point);
          assert.ok(center.distanceTo(physical)<=.3,
            `${edgeId} ${quality} chunk ${chunkIndex} row ${i}: visible road deviates from physics`);
        }
        chunk.dispose();
      }
    }
  }
});

test('lava flow UVs follow the real ribbon and stay seamless across streamed chunks',()=>{
  const first=createVolcanicCrownChunk('ground-5',0,'low');
  const second=createVolcanicCrownChunk('ground-5',1,'low');
  for(const chunk of [first,second]){
    for(const name of ['physical-road','lava-river']){
      const geometry=chunk.group.getObjectByName(name).geometry;
      const uv=geometry.getAttribute('uv');
      assert.ok(uv,`${name} needs UVs for real flowing basalt/lava shader`);
      assert.equal(uv.count,geometry.getAttribute('position').count);
      assert.equal(uv.getX(0),0);
      assert.equal(uv.getX(1),1);
      assert.ok(uv.getY(uv.count-1)>uv.getY(0),
        `${name} must track forward progression, not a constant UV`);
    }
  }
  const firstUV=first.group.getObjectByName('lava-river').geometry.getAttribute('uv');
  const nextUV=second.group.getObjectByName('lava-river').geometry.getAttribute('uv');
  assert.ok(Math.abs(firstUV.getY(firstUV.count-1)-nextUV.getY(0))<1e-6,
    'flowing shader must not restart the texture at every streamed chunk');
  first.dispose();second.dispose();
});
