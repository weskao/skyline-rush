import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WORLD_THEMES, createWorldTourScene } from '../src/world-tour-scene.js';
import { makeLandmark } from '../src/world-tour-landmarks.js';
import { RACE_TRACKS } from '../src/game.js';

const ids=['taipei','tokyo','alpine','coastal','cosmic'];
const expected={
  taipei:['office','gate','temple'],
  tokyo:['crossing','tower','railway'],
  alpine:['tunnel','railway','mountain'],
  coastal:['lighthouse','bridge','arch'],
  cosmic:['planet','cosmic-gate'],
};

test('hero architecture is present and distinguishable across all five locations',()=>{
 for(const id of ids){
  const theme=WORLD_THEMES[id];
  assert.deepEqual(new Set(theme.landmarks.map(x=>x.kind)),new Set(expected[id]),id);
  const landmarkAt=theme.landmarks.map(x=>x.at);
  assert.equal(new Set(landmarkAt).size,landmarkAt.length);
  for(const item of theme.landmarks){
   assert.ok(item.at>0&&item.at<RACE_TRACKS[id].length);
   const group=makeLandmark(item.kind,theme);
   assert.equal(group.userData.landmarkKind,item.kind);
   const meshCount=group.children.filter(x=>x.isMesh).length;
   assert.ok(meshCount>=6,`${id} ${item.kind} lacks detail: ${meshCount} meshes`);
   for(const mesh of group.children){
    assert.ok(mesh.position.toArray().every(Number.isFinite));
    assert.ok(mesh.scale.toArray().every(Number.isFinite));
   }
  }
 }
 const office=makeLandmark('office',WORLD_THEMES.taipei);
 const tokyo=makeLandmark('tower',WORLD_THEMES.tokyo);
 assert.ok(office.children.length>95,'Presidential Office needs repeated windows and brick courses');
 assert.ok(tokyo.children.length>50,'Tokyo Tower needs open lattice and observation decks');
});

test('shared scenery system renders five real road meshes, boost hoops and quality budgets',()=>{
 const scene=new THREE.Scene(),visual=createWorldTourScene(scene);
 const world=scene.getObjectByName('World Tour authored scenery');
 assert.ok(world);
 const geometry=world.getObjectByName('World Tour authored scenery').children.find(c=>c.isMesh);
 for(const id of ids){
  const t=RACE_TRACKS[id].sections.find(s=>s.type==='boost-tunnel');
  visual.update(id,t.from+28,'high',RACE_TRACKS[id].sections,1,false);
  assert.equal(world.visible,true);
  const boost=world.getObjectByName('Playable speed tunnel');
  assert.equal(boost.visible,true);
  assert.ok(boost.children.some(c=>c.visible));
  const road=world.children.find(c=>c.isMesh&&c.geometry.isBufferGeometry);
  assert.ok(road);
  const data=road.geometry.attributes.position.array;
  assert.ok([...data].every(Number.isFinite),`${id} road geometry has NaN`);
  visual.update(id,t.from+28,'low',RACE_TRACKS[id].sections,1,true);
  assert.ok(boost.children.filter(c=>c.name.startsWith('Energy hoop') && c.visible).length<=8,
    'low quality must cut energy hoops; instanced glass panels are separate objects');
 }
 visual.hide();assert.equal(world.visible,false);
 visual.dispose();assert.ok(!scene.children.includes(world));
});
