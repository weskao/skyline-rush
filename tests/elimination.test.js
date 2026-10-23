import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElimination,stepElimination} from '../src/elimination.js';
import {createRace,stepRace} from '../src/game.js';
const make=(player,rivals,elapsed)=>({elapsed,player:{distance:player},rivals:rivals.map(([name,distance])=>({name,distance,speed:60}))});
test('trailing AI is eliminated exactly once at each ten-second checkpoint',()=>{
 const state=createElimination(),race=make(100,[['NOVA',80],['ORBIT',60],['APEX',40]],9.9);
 assert.equal(stepElimination(state,race),null);
 race.elapsed=10;assert.deepEqual(stepElimination(state,race),{eliminated:'APEX',outcome:null});
 assert.equal(race.rivals.length,2);assert.equal(stepElimination(state,race),null);
 race.elapsed=20;assert.deepEqual(stepElimination(state,race),{eliminated:'ORBIT',outcome:null});
 race.elapsed=30;assert.deepEqual(stepElimination(state,race),{eliminated:'NOVA',outcome:'won'});
 assert.equal(state.outcome,'won');assert.equal(race.rivals.length,0);
});
test('last-place player loses without removing an opponent',()=>{
 const state=createElimination(),race=make(5,[['NOVA',100],['ORBIT',80],['APEX',60]],10);
 assert.deepEqual(stepElimination(state,race),{eliminated:'YOU',outcome:'lost'});
 assert.equal(race.rivals.length,3);
 race.elapsed=50;assert.equal(stepElimination(state,race),null);
});
test('ties are decided by deterministic initial racer order',()=>{
 const state=createElimination(),race=make(100,[['NOVA',90],['ORBIT',90],['APEX',90]],10);
 assert.deepEqual(stepElimination(state,race),{eliminated:'APEX',outcome:null});
});

test('RED MODE-08: the player finishes 2nd, 3rd or 4th according to remaining contenders',()=>{
  for (const opponents of [1,2,3]) {
    const race=createRace('coast',{mode:'elimination'});
    race.rivals.length=opponents;
    race.phase='racing';
    race.elapsed=9.99;
    race.player.distance=20;
    race.player.speed=0;
    race.rivals.forEach((r,i)=> {r.distance=300+i*20; r.speed=0;});
    stepRace(race,{},.05);
    assert.equal(race.phase,'finished',opponents+' remaining rivals');
    assert.equal(race.result.position,opponents+1,'must report real knockout placement');
    assert.equal(race.result.success,false);
    assert.equal(race.rivals.length,opponents);
  }
});

test('MODE-08: eliminated actors use real progress, not camera visibility',()=>{
  const state=createElimination();
  const race=make(100,[['NOVA',125],['ORBIT',65],['APEX',80]],10);
  race.rivals[0].offscreen=true;
  race.rivals[1].offscreen=false;
  assert.deepEqual(stepElimination(state,race),{eliminated:'ORBIT',outcome:null});
  assert.deepEqual(state.eliminated,['ORBIT']);
});
