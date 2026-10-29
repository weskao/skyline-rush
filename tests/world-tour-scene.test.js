import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WORLD_THEMES, createWorldTourScene, blocksLandmark, landmarkSafePlan, detailPlan, roadObstacles } from '../src/world-tour-scene.js';
import { sceneryPlan, propParts, ROAD_CLEARANCE } from '../src/world-tour-scenery.js';
import { makeLandmark } from '../src/world-tour-landmarks.js';
import { RACE_TRACKS } from '../src/game.js';
import { trackLocalPosition } from '../src/track-paths.ts';

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
test('landmark approaches keep every roadside prop; blockers move or shrink',()=>{
  for(const id of ids)for(const low of [false,true]){
    const blocks=item=>WORLD_THEMES[id].landmarks.some(l=>blocksLandmark(id,l,item));
    let moved=0;
    for(let chunk=0;chunk<=Math.ceil(RACE_TRACKS[id].length/120);chunk++){
      const plan=sceneryPlan(id,chunk,low),safe=landmarkSafePlan(id,chunk,low);
      assert.equal(safe.length,plan.length,id+' chunk '+chunk+' lost props');
      safe.forEach((item,i)=>{
        if(!blocks(plan[i]))return assert.deepEqual(item,plan[i]);
        if(item.size<plan[i].size)return assert.equal(item.distance,plan[i].distance);
        assert.ok(!blocks(item),id+' moved prop still blocks');
        moved++;
      });
    }
    if(!low)assert.ok(moved>0,id+' never moves a blocker');
  }
});
test('roadside props may reach into the road as solid obstacles, never nearer the centre than ROAD_CLEARANCE',()=>{
  // Does any part of the prop reach within `limit` of the centre line?
  const reaches=(item,limit)=>propParts(item.kind).some(b=>
    item.side*item.offset+b.max.x*item.size>-limit&&item.side*item.offset+b.min.x*item.size<limit);
  let solidCount=0;
  for(const id of ids){
    for(let chunk=0;chunk<=Math.ceil(RACE_TRACKS[id].length/120);chunk++){
      const high=landmarkSafePlan(id,chunk),low=detailPlan(id,chunk,true);
      for(const item of high)assert.ok(!reaches(item,ROAD_CLEARANCE-1e-9),id+' '+item.kind+' @'+Math.round(item.distance)+' covers the centre lanes');
      // Low detail keeps every prop the simulation treats as solid: no invisible walls.
      const obstacles=high.filter(item=>reaches(item,11.05)); // ROAD_LIMIT + car half width
      solidCount+=obstacles.length;
      for(const item of obstacles)assert.ok(low.some(l=>l.distance===item.distance&&l.side===item.side&&l.kind===item.kind),id+' low detail hides a solid '+item.kind);
    }
    for(const p of roadObstacles(id))assert.ok(p.left>=ROAD_CLEARANCE-1e-9||p.right<=-ROAD_CLEARANCE+1e-9,id+' obstacle reaches the centre lanes');
  }
  assert.ok(solidCount>40,'solid props were checked against low detail');
  assert.ok(roadObstacles('tokyo').some(p=>p.kind==='train'&&p.bottom<1),'Tokyo trains stay in the road as obstacles');
});

// Counting trig calls is a deterministic stand-in for timing: every centreline sample costs two or more.
function trigCalls(run){
  const {sin,cos}=Math;let n=0;
  Math.sin=x=>(n++,sin(x));Math.cos=x=>(n++,cos(x));
  try{run();}finally{Math.sin=sin;Math.cos=cos;}
  return n;
}
test('a road rebuild samples each row of the centreline once, not once per lane mark',()=>{
  const tour=createWorldTourScene(new THREE.Scene());
  tour.update('taipei',1200.5);
  // Taipei costs two trig calls per sample; 139 rows x 24 samples is the budget (was ~69 samples a row).
  const calls=trigCalls(()=>tour.update('taipei',1212.5));
  assert.ok(calls<=139*24*2+200,`road rebuild made ${calls} trig calls`);
  assert.ok(trigCalls(()=>tour.update('taipei',1213))<20,'staying inside a 12 m sector rebuilds nothing');
});
test('the rebuilt road ribbon still sits on the shared centreline on every World Tour road',()=>{
  const scene=new THREE.Scene(),tour=createWorldTourScene(scene);
  const group=scene.getObjectByName('World Tour authored scenery');
  const road=group.children.find(o=>o.isMesh&&o.geometry.attributes.position.count===139*2);
  for(const id of ids){
    tour.update(id,1213);
    const origin=1212,start=origin-160,positions=road.geometry.attributes.position.array;
    for(const i of [0,40,138])for(const side of [0,1]){
      const expected=trackLocalPosition(id,start+i*12,side?12:-12,0,origin).map(Math.fround);
      assert.deepEqual([...positions.slice((i*2+side)*3,(i*2+side)*3+3)],expected,`${id} row ${i}`);
    }
  }
});
