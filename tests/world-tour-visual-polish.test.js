import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RACE_TRACKS } from '../src/game.js';
import { createWorldTourScene,WORLD_THEMES } from '../src/world-tour-scene.js';
import { createSceneryKit,SCENERY_KINDS } from '../src/world-tour-scenery.js';

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
    assert.ok(chunks.some(chunk=>chunk.children.some(child=>SCENERY_KINDS[id].includes(child.name))),id+' should have authored roadside assets');
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
    // First chunk from 11 ahead that holds props (a landmark plaza may empty
    // one); every one of them stays streamed across the 1440 m boundary.
    const prop=c=>SCENERY_KINDS[id].includes(c.name)&&c.userData.batched;
    const chunk=[11,12,13,14,15,16].map(n=>layer.getObjectByName('world-tour-'+id+'-chunk-'+n))
      .find(c=>c?.children.some(prop));
    assert.ok(chunk,id+' has a persistent chunk');
    const first=chunk.children.find(prop);
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

test('medium World Tour scenery streams fewer chunks than high and more than low',()=>{
  const scene=new THREE.Scene(),renderer=createWorldTourScene(scene);
  const root=scene.getObjectByName('World Tour authored scenery');
  const layer=root.getObjectByName('Distance-anchored continuous scenery');
  try {
    for(const id of ids){
      const sections=RACE_TRACKS[id].sections;
      const count=quality=>{
        renderer.update(id,1575,quality,sections,1,true);
        return layer.children.filter(node=>node.name.startsWith('world-tour-'+id+'-chunk-')).length;
      };
      const high=count('high'),medium=count('medium'),low=count('low');
      assert.ok(low<medium&&medium<high,
        id+' expected low < medium < high streaming budgets, got '+[low,medium,high].join('/'));
    }
  } finally {renderer.dispose();}
});

test('World Tour asphalt uses restrained destination-specific PBR under every quality tier',()=>{
  const expected={
    taipei: { roughness:.93,metalness:.02 },
    tokyo: { roughness:.86,metalness:.045 },
    alpine: { roughness:.97,metalness:.01 },
    coastal: { roughness:.90,metalness:.018 },
    cosmic: { roughness:.88,metalness:.055 },
  };
  const scene=new THREE.Scene(),visual=createWorldTourScene(scene);
  const road=scene.getObjectByName('World Tour authored scenery').children
    .find(node=>node.isMesh&&node.geometry?.index);
  assert.ok(road);
  try {
    for(const [id,material] of Object.entries(expected)){
      for(const quality of ['low','medium','high']){
        visual.update(id,1500,quality,RACE_TRACKS[id].sections,1,true);
        assert.equal(road.material.roughness,material.roughness,`${id}/${quality} roughness`);
        assert.equal(road.material.metalness,material.metalness,`${id}/${quality} metalness`);
        assert.ok(road.material.roughness>=.85&&road.material.metalness<=.06,
          id+' preserves readable non-mirror asphalt');
      }
    }
    assert.ok(expected.tokyo.roughness<expected.alpine.roughness,
      'Tokyo rain-damp satin must be subtler than a mirror while Alpine stays matte');
  } finally { visual.dispose(); }
});
