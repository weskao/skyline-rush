import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElimination,stepElimination} from '../src/elimination.js';
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
