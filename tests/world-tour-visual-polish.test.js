import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RACE_TRACKS } from '../src/game.js';
import { createWorldTourScene,WORLD_THEMES } from '../src/world-tour-scene.js';
import { createSceneryKit } from '../src/world-tour-scenery.js';

const ids=['taipei','tokyo','alpine','coastal','cosmic'];
test('five worlds show no central emissive asphalt or shared placeholder scenery',()=>{
  const scene=new THREE.Scene(),renderer=createWorldTourScene(scene);
  const root=scene.getObjectByName('World Tour authored scenery');
  for(const id of ids){
    renderer.update(id,1575,'high',RACE_TRACKS[id].sections,3,false);
    const road=root.children.find(mesh=>mesh.isMesh&&mesh.geometry.isBufferGeometry&&mesh.geometry.index);
    assert.ok(road);
    assert.ok(road.material.roughness>=.85,id+' should have nonreflective asphalt');
    assert.ok(road.material.metalness<=.06,id+' should have nonmetallic asphalt');
    assert.ok(WORLD_THEMES[id].warmth<=.1,id+' must not have a front-facing warm glare');
    const scenery=root.getObjectByName('Distance-anchored continuous scenery');
    const chunks=scenery.children.filter(child=>child.name.startsWith('world-tour-'+id+'-chunk-'));
    assert.ok(chunks.length>=10&&chunks.length<=16,id+' streams a bounded set of chunks');
    assert.ok(chunks.some(chunk=>chunk.children.some(child=>child.name?.includes('terrain')||child.children.some(c=>c.name==='arcade'||c.name==='night-shop'||c.name==='satellite')))||id==='coastal'||id==='alpine');
  }
  renderer.dispose();
});
test('persistent roadside props do not teleport or recreate on 12-m road rebuild boundaries',()=>{
  const scene=new THREE.Scene(),renderer=createWorldTourScene(scene);
  const root=scene.getObjectByName('World Tour authored scenery');
  for(const id of ids){
    const secs=RACE_TRACKS[id].sections;
    renderer.update(id,1439.95,'high',secs,1,true);
    const layer=root.getObjectByName('Distance-anchored continuous scenery');
    const chunk=layer.getObjectByName('world-tour-'+id+'-chunk-11');
    assert.ok(chunk,id+' has a persistent chunk');
    const first=chunk.children.find(c=>c.children.some(x=>x.name));
    assert.ok(first,id+' has authored props');
    root.updateMatrixWorld(true);
    const before=new THREE.Vector3();first.getWorldPosition(before);
    renderer.update(id,1440.06,'high',secs,1.01,true);
    assert.equal(layer.getObjectByName(chunk.name),chunk,id+' must preserve existing chunk objects');
    root.updateMatrixWorld(true);
    const after=new THREE.Vector3();first.getWorldPosition(after);
    assert.ok(before.distanceTo(after)<.6,id+' scenery should shift smoothly with car');
    assert.ok(layer.children.length<=16,id+' may not leak accumulated chunks');
  }
  renderer.dispose();
});
test('alpine cliff geometry joins exactly at 120 metre chunk edges',()=>{
  const kit=createSceneryKit();
  const left=kit.terrain('alpine',10),right=kit.terrain('alpine',11);
  assert.ok(left&&right);
  for(let side=0;side<2;side++){
    const a=left.children[side].geometry.attributes.position;
    const b=right.children[side].geometry.attributes.position;
    for(let k=0;k<4;k++){
      const i=a.count-4+k;
      for(const component of ['X','Y','Z']){
        assert.ok(Math.abs(a['get'+component](i)-b['get'+component](k))<.001,
          'terrain '+side+' '+component+' must meet seamlessly');
      }
    }
  }
  kit.dispose();
});
