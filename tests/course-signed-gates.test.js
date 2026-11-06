import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { createRouteProgress } from '../src/course-progress.ts';
const module = await import('../src/course-signed-gates.ts').catch(() => ({}));
const { advanceSignedGate } = module;
const n=(id,kind,at)=>({id,kind,at});
const e=(id,from,to,points,mode='ground')=>({id,from,to,points,mode,width:20});
const graph=validateCourseGraph({
  id:'gate-fixture',version:1,start:'start',finish:'finish',
  nodes:[n('start','start',[0,0,0]),n('split','split',[0,0,-100]),n('join','merge',[0,0,-200]),n('cp','checkpoint',[0,0,-300]),n('finish','finish',[0,0,-400])],
  edges:[e('approach','start','split',[[0,0,0],[0,0,-100]]),
    e('main','split','join',[[0,0,-100],[0,0,-200]]),
    e('air','split','join',[[0,0,-100],[0,40,-150],[0,0,-200]],'flight'),
    e('checkpoint','join','cp',[[0,0,-200],[0,0,-300]]),
    e('finish-road','cp','finish',[[0,0,-300],[0,0,-400]])],
  groundRoute:['approach','main','checkpoint','finish-road'],checkpoints:['cp']
});
const sweep=(edgeId,nextEdgeId,z,at={})=>({edgeId,
  fromS:routeLength(graph,edgeId)-3,toS:routeLength(graph,edgeId)+1,
  fromPosition:[0,0,z+3],toPosition:[0,0,z-1],maxStepMetres:5,
  ...(nextEdgeId?{nextEdgeId}:{}), ...at});

test('the signed physical-gate API exists',()=>assert.equal(typeof advanceSignedGate,'function'));
test('genuine forward world-space crossings progress split, checkpoint and finish in order',()=>{
  let state=createRouteProgress(graph);
  state=advanceSignedGate(graph,state,sweep('approach','main',-100));
  assert.equal(state.currentEdgeId,'main');
  state=advanceSignedGate(graph,state,sweep('main','checkpoint',-200));
  state=advanceSignedGate(graph,state,sweep('checkpoint','finish-road',-300));
  assert.equal(state.nextCheckpoint,1);
  assert.equal(state.finished,false);
  state=advanceSignedGate(graph,state,sweep('finish-road',undefined,-400));
  assert.equal(state.finished,true);
});
test('high flyover or lateral bypass cannot collect an otherwise valid scalar checkpoint',()=>{
  const state={currentEdgeId:'checkpoint',nextCheckpoint:0,finished:false};
  for(const at of [
    {fromPosition:[0,9,-297],toPosition:[0,9,-301]},
    {fromPosition:[11,0,-297],toPosition:[11,0,-301]},
    {fromPosition:[-11,0,-297],toPosition:[-11,0,-301]},
  ]) assert.deepEqual(advanceSignedGate(graph,state,sweep('checkpoint','finish-road',-300,at)),state);
});
test('reverse direction, no plane crossing and bad connected edge cannot update state',()=>{
  const state=createRouteProgress(graph);
  for(const at of [
    {fromPosition:[0,0,-101],toPosition:[0,0,-97]},
    {fromPosition:[0,0,-96],toPosition:[0,0,-95]},
    {nextEdgeId:'finish-road'},
  ]) assert.deepEqual(advanceSignedGate(graph,state,sweep('approach','main',-100,at)),state);
});
test('teleport, unsupported time-step, nonfinite position and off-edge step are rejected',()=>{
  const state=createRouteProgress(graph);
  for(const at of [
    {fromS:2,toS:routeLength(graph,'approach')+1},
    {maxStepMetres:0},
    {maxStepMetres:Infinity},
    {fromPosition:[0,0,-300],toPosition:[0,0,-101]},
    {fromPosition:[0,NaN,-97]},
  ]) assert.deepEqual(advanceSignedGate(graph,state,sweep('approach','main',-100,at)),state);
});
test('flight must physically land into the merge gate before joining a ground course',()=>{
  const state={currentEdgeId:'air',nextCheckpoint:0,finished:false};
  const landed=sweep('air','checkpoint',-200,{fromPosition:[0,1,-203+6],toPosition:[0,1,-201]});
  // Default flight route endpoint frame may differ; signed crossing still requires a real before/after plane sweep.
  const next=advanceSignedGate(graph,state,landed);
  assert.equal(next.currentEdgeId,'checkpoint');
  const invalid=sweep('air','checkpoint',-200,{fromPosition:[0,40,-197],toPosition:[0,40,-201]});
  assert.deepEqual(advanceSignedGate(graph,state,invalid),state);
});
test('finishing early without checkpoint progress cannot be accepted even at correct world coordinates',()=>{
  const forged={currentEdgeId:'finish-road',nextCheckpoint:0,finished:false};
  assert.deepEqual(advanceSignedGate(graph,forged,sweep('finish-road',undefined,-400)),forged);
});
test('gate height limits may be explicitly narrowed by authoritative map metadata',()=>{
  const state={currentEdgeId:'checkpoint',nextCheckpoint:0,finished:false};
  const event=sweep('checkpoint','finish-road',-300,{fromPosition:[0,3,-297],toPosition:[0,3,-301]});
  assert.deepEqual(advanceSignedGate(graph,state,event,{minHeight:-1,maxHeight:2}),state);
  const allowed=advanceSignedGate(graph,state,event,{minHeight:-1,maxHeight:4});
  assert.equal(allowed.nextCheckpoint,1);
});
