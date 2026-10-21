import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { createWorldTourScene } from '../src/world-tour-scene.js';

const ids = ['taipei','tokyo','alpine','coastal','cosmic'];

test('all five World Tour tracks complete past every shortcut and boost tunnel without a stalled simulation', () => {
  for (const id of ids) {
    const race=createRace(id), tunnel=race.sections.find(s=>s.type==='boost-tunnel');
    startRace(race);
    race.phase='racing';
    race.traffic=[];race.rivals=[];
    let claimedAt=null;
    let iterations=0;
    while(race.phase==='racing' && iterations++<30000) {
      const prior=race.player.distance;
      stepRace(race,{ throttle:true, laneAssist:true },1/60);
      assert.ok(Number.isFinite(race.player.distance),id+' distance should stay finite');
      assert.ok(race.player.distance>=prior,id+' must make forward progress');
      if(claimedAt===null&&race.player.boostTunnelClaimed.length)claimedAt=race.player.distance;
    }
    assert.equal(race.phase,'finished',id+' must finish without freezing');
    assert.ok(iterations<30000,id+' cannot get stuck indefinitely');
    assert.ok(claimedAt!==null,id+' should cross its boost tunnel');
    assert.ok(claimedAt>=tunnel.from&&claimedAt<tunnel.to,id+' tunnel claim position');
    assert.equal(race.player.boostTunnelClaimed.length,1,id+' reward must not loop');
  }
});

test('repeated world frames in one road section reuse GPU transforms instead of rebuilding ~1000 matrices every frame', () => {
  const scene=new THREE.Scene(),world=createWorldTourScene(scene),root=scene.getObjectByName('World Tour authored scenery');
  const calls=[];
  root.traverse(obj=>{
    if(!obj.isInstancedMesh)return;
    const original=obj.setMatrixAt.bind(obj);
    obj.setMatrixAt=(...args)=>{calls.push(obj.name||'instance');return original(...args);};
  });
  for (const id of ids) {
    const sections=RACE_TRACKS[id].sections;
    world.update(id,3020.1,'high',sections,0,false);
    assert.ok(calls.length>0,id+' must initialize its road');
    calls.length=0;
    for(let i=0;i<12;i++){
      world.update(id,3020.1+i*.01,'high',sections,i*.02,false);
    }
    assert.equal(calls.length,0,id+' must not rebuild stationary static instances');
  }
  world.dispose();
});

test('scene traversal along all five routes remains finite, including each tunnel midpoint',()=>{
 const scene=new THREE.Scene(),world=createWorldTourScene(scene);
 const root=scene.getObjectByName('World Tour authored scenery');
 for(const id of ids){
   const sections=RACE_TRACKS[id].sections;
   for(let d=0;d<=RACE_TRACKS[id].length;d+=125){
     assert.doesNotThrow(()=>world.update(id,d,'low',sections,d/80,true),id+' @ '+d);
     root.traverse(obj=>{
       if(obj.isMesh||obj.isInstancedMesh) {
         assert.ok(obj.position.toArray().every(Number.isFinite),id+' mesh @ '+d);
       }
     });
   }
 }
 world.dispose();
});