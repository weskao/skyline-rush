import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSkyScene } from '../src/sky-scene.js';
import { createWorldTourScene, endlessRoadObstacles } from '../src/world-tour-scene.js';
import { RACE_TRACKS } from '../src/game.js';

test('Sky Spiral road buffers continue past the authored finish with bounded live GPU instances',()=>{
  const scene=new THREE.Scene(),sky=createSkyScene(scene);
  try{
    const group=scene.getObjectByName('Sky Spiral 3D course');
    const road=group.children.find(m=>m.isMesh&&m.geometry?.index);
    assert.ok(road);
    const size=group.children.length,positions=road.geometry.getAttribute('position');
    for(const d of [7000,22500,55500,105500]){
      sky.update(d,'high',true);
      assert.equal(group.visible,true);
      assert.equal(group.children.length,size,'no new meshes as infinite distance increases');
      const minZ=Math.min(...Array.from({length:181},(_,i)=>positions.getZ(i*2)));
      const maxZ=Math.max(...Array.from({length:181},(_,i)=>positions.getZ(i*2)));
      assert.ok(Number.isFinite(minZ)&&Number.isFinite(maxZ));
      assert.ok(maxZ-minZ>400,'road mesh retains a full local drawing window');
    }
  }finally{sky.dispose();}
});

test('all five World Tour Endless roads generate bounded themed chunks and colliders past finish',()=>{
  const scene=new THREE.Scene(),tour=createWorldTourScene(scene);
  const layer=scene.getObjectByName('Distance-anchored continuous scenery');
  const root=scene.getObjectByName('World Tour authored scenery');
  const road=root.children.find(m=>m.isMesh&&m.geometry?.index);
  assert.ok(road);
  try {
    for(const id of ['taipei','tokyo','alpine','coastal','cosmic']){
      const length=RACE_TRACKS[id].length;
      for(const d of [length+2000,40000,85000]){
        tour.update(id,d,'medium',[],0,true,true);
        const chunks=layer.children.filter(child=>child.name.startsWith('world-tour-'+id+'-chunk-'));
        assert.ok(chunks.length>=10&&chunks.length<=15,id+' must keep fixed active chunks');
        assert.ok(chunks.every(c=>c.userData.chunkIndex*120>=d-1200),id+' must evict old chunks');
        const positions=road.geometry.getAttribute('position');
        assert.ok(Number.isFinite(positions.getX(20))&&Number.isFinite(positions.getZ(20)));
        const obstacles=endlessRoadObstacles(id,d);
        assert.ok(obstacles.length<500,id+' must not retain infinite collision arrays');
        assert.ok(obstacles.every(o=>o.from>=d-1200 && o.to<=d+2000),id+' collision window must be local');
      }
    }
  }finally{tour.dispose();}
});

test('Sky Spiral Endless keeps its visible hero fixed through repeating scenery seams',()=>{
  const scene=new THREE.Scene(),sky=createSkyScene(scene);
  const root=scene.getObjectByName('Sky Spiral 3D course');
  const visibleAhead=()=>root.children
    .filter(node=>node.visible && node.children.some(child=>child.geometry?.type==='CylinderGeometry'))
    .filter(node=>node.position.z < -50 && node.position.z > -1450)
    .map(node=>node.position.clone());
  try {
    for(const seam of [6600,8400,10200,12000,13800,15600]){
      sky.update(seam-.25,'high',true);
      const before=visibleAhead();
      sky.update(seam+.25,'high',true);
      const after=visibleAhead();
      assert.ok(before.length>0 && after.length>0,'visible hero must not vanish around '+seam);
      assert.ok(before.some(p=>after.some(q=>p.distanceTo(q)<5)),
        'no visible landmark may teleport at '+seam+'m');
    }
  }finally{sky.dispose();}
});
