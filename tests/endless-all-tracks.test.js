import test from 'node:test';
import assert from 'node:assert/strict';
import {createRace,stepRace,RACE_TRACKS} from '../src/game.js';
import {MODES} from '../src/race-config.ts';
import {trackPoint,trackFrame,trackLocalPosition} from '../src/track-paths.ts';
import {sceneryPlan} from '../src/world-tour-scenery.js';

const all=Object.keys(RACE_TRACKS);
test('endless is one existing mode and supports all ten tracks without authored route mutation',()=>{
 assert.equal(MODES.filter(m=>m==='endless').length,1);
 assert.equal(all.length,10);
 for(const id of all){
   const original=JSON.stringify(RACE_TRACKS[id]);
   const race=createRace(id,{mode:'endless'});
   assert.equal(race.trackId,id);
   assert.ok(race.endless,id);
   assert.equal(race.sections.length,0,'no finite authored gaps or finish-only obstacles');
   race.phase='racing';
   for(const d of [RACE_TRACKS[id].length+80,25000,80000]){
     Object.assign(race.player,{distance:d,speed:65,x:0,altitude:0,cooldown:2});
     stepRace(race,{throttle:true},1/60);
     assert.equal(race.phase,'racing',id+' @ '+d);
     assert.ok(race.player.distance>d,id+' progress must stay absolute');
     assert.ok(race.traffic.length<=40 && race.pickups.length<=20 && race.rings.length<=15);
   }
   assert.equal(JSON.stringify(RACE_TRACKS[id]),original,'original sprint routes must stay identical');
 }
});

test('World Tour & Sky Spiral centreline extends continuously beyond authored finish',()=>{
 for(const id of ['spiral','taipei','tokyo','alpine','coastal','cosmic']){
   const finish=RACE_TRACKS[id].length;
   const p=trackPoint(id,finish,true),next=trackPoint(id,finish+12,true),far=trackPoint(id,finish+100000,true);
   assert.deepEqual(trackPoint(id,finish+120),trackPoint(id,finish),'finite path remains clamped');
   assert.ok(Math.hypot(next.x-p.x,next.y-p.y,next.z-p.z)>1,id+' must extend');
   assert.ok(Math.hypot(far.x-next.x,far.y-next.y,far.z-next.z)>1000);
   for(const d of [finish-1,finish,finish+1,finish+120,finish+32000]){
     const frame=trackFrame(id,d,true),at=trackLocalPosition(id,d,0,0,d,true);
     assert.ok(frame.forward.every(Number.isFinite)&&at.every(Number.isFinite));
     assert.ok(Math.hypot(...at)<.0001,'self-relative point must be origin');
   }
 }
});

test('World Tour procedural detail still exists far beyond finite landmarks',()=>{
 for(const id of ['taipei','tokyo','alpine','coastal','cosmic']){
   for(const chunk of [Math.ceil(RACE_TRACKS[id].length/120)+3,100,400]){
     const props=sceneryPlan(id,chunk);
     assert.ok(props.length>0,id+' / '+chunk+' should be an inhabited road');
     assert.ok(props.every(p=>p.distance>=chunk*120&&p.distance<(chunk+1)*120));
   }
 }
});
