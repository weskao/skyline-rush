import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace } from '../src/game.js';
import { hazardX } from '../src/hazards.ts';
import { recordModeRace, loadModeHistory, loadHistory, loadUnlocks } from '../src/history.js';

function crossHazard(near) {
  const race=createRace('coast',{mode:'gauntlet'});
  const hazard=race.hazards[0];
  race.phase='racing';
  race.player.distance=hazard.distance-0.7;
  race.player.speed=82;
  const x=hazardX(hazard,1/60);
  race.player.x=near ? x+(x>0?-2.9:2.9) : x>0 ? -7.5:7.5;
  race.player.altitude=0;
  stepRace(race,{throttle:true},1/60);
  return { race, hazard };
}

test('RED MODE-07: near-miss driving earns an extra bounded obstacle score and a near-miss count',()=>{
  const near=crossHazard(true), far=crossHazard(false);
  assert.equal(near.hazard.passed,true);
  assert.equal(near.hazard.hit,false);
  assert.equal(near.race.player.collisions,0);
  assert.equal(near.race.player.nearMisses,1);
  assert.equal(far.race.player.nearMisses,0);
  assert.ok(near.race.player.score >= far.race.player.score+100, 'a near pass must be worth more than a safe pass');
  stepRace(near.race,{throttle:true},1/60);
  assert.equal(near.race.player.nearMisses,1,'a barrier must only reward one close pass');
});

test('MODE-07: gauntlet hazard scores remain challenge-only, separate from Career records',()=>{
  const {race}=crossHazard(true);
  race.phase='finished';
  race.result={time:81,score:Math.round(race.player.score),position:1,success:true};
  const values=new Map();
  const store={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.deepEqual(recordModeRace(race,store),{best:81,record:true});
  assert.equal(loadModeHistory(store)[0].modeId,'gauntlet');
  assert.deepEqual(loadHistory(store),[]);
  assert.deepEqual(loadUnlocks(store),['coast']);
});
