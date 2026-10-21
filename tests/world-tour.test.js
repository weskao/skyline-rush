import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS, createRace } from '../src/game.js';
import { trackPoint, trackFrame, trackOverview } from '../src/track-paths.js';
const ids=['taipei','tokyo','alpine','coastal','cosmic'];
test('five new world-tour routes are deterministic and all 5–8 km',()=>{
 assert.deepEqual(ids.map(id=>RACE_TRACKS[id].length),[6200,6800,7600,5800,8000]);
 for(const id of ids){
  assert.deepEqual(createRace(id),createRace(id));
  const section=RACE_TRACKS[id].sections.filter(s=>s.type==='shortcut');
  assert.equal(section.length,1);
  assert.equal(section[0].to-section[0].from,500);
 }
});
test('all five paths are continuous, finite and have distinct overview silhouettes',()=>{
 const unique = new Set();
 for(const id of ids){
  const shape=trackOverview(id);
  assert.equal(shape.length,128);
  unique.add(shape.map(p=>p.x.toFixed(3)).join(','));
  for(let d=20;d<RACE_TRACKS[id].length;d+=20){
   const a=trackPoint(id,d-.01),b=trackPoint(id,d+.01);
   assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.15,id);
   const frame=trackFrame(id,d);
   for(const v of [frame.forward,frame.right,frame.up])assert.ok(v.every(Number.isFinite));
  }
 }
 assert.equal(unique.size,5);
});
test('world-tour road ribbon carries finite unit normals so lit materials never render NaN',async()=>{
 const THREE=await import('three');
 const {createWorldTourScene}=await import('../src/world-tour-scene.js');
 const scene=new THREE.Scene(),tour=createWorldTourScene(scene);
 for(const id of ids){
  tour.update(id,500,'high');
  let road;scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.geometry.index?.count===140*6)road=o;});
  const normal=road.geometry.attributes.normal;
  assert.ok(normal,`${id} road has a normal attribute`);
  for(let i=0;i<normal.count;i++)assert.ok(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-6,id);
 }
 tour.dispose();
});
