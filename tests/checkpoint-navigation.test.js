import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCheckpointRush,stepCheckpointRush,checkpointDirection} from '../src/checkpoint-rush.ts';
const track={length:4100,sections:[]};
test('direction indicator uses road-relative lanes, then altitude',()=>{
 assert.equal(checkpointDirection({x:0,altitude:0},{x:-5,altitude:0}),'left');
 assert.equal(checkpointDirection({x:0,altitude:0},{x:5,altitude:0}),'right');
 assert.equal(checkpointDirection({x:0,altitude:0},{x:0,altitude:3}),'up');
 assert.equal(checkpointDirection({x:0,altitude:3},{x:0,altitude:0}),'down');
 assert.equal(checkpointDirection({x:0,altitude:0},{x:0,altitude:0}),'center');
});
test('precise center crossing grants an extra 150 points only once',()=>{
 const state=createCheckpointRush(track),gate=state.gates[0];
 assert.equal(stepCheckpointRush(state,gate.distance-1,{distance:gate.distance+1,x:gate.x,altitude:gate.altitude},.05),400);
 assert.equal(state.perfect,1);
 assert.equal(stepCheckpointRush(state,gate.distance-1,{distance:gate.distance+2,x:gate.x,altitude:gate.altitude},.05),0);
});
test('safe-width crossing grants 250 without a perfect',()=>{
 const state=createCheckpointRush(track),gate=state.gates[0];
 assert.equal(stepCheckpointRush(state,gate.distance-1,{distance:gate.distance+1,x:gate.x+2,altitude:gate.altitude},.05),250);
 assert.equal(state.perfect,0);
});
