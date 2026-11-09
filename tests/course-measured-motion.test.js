import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCourseTravel, courseTravelPosition } from '../src/course-travel.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';

const { advanceMeasuredCourseTravel } = await import('../src/course-measured-motion.ts').catch(() => ({}));
const n = (id, kind, at) => ({ id, kind, at });
const e = (id, from, to, points, mode='ground') => ({ id, from, to, points, width:20, mode });
const graph = {
  id:'physical-race', version:1, start:'start', finish:'finish',
  nodes:[n('start','start',[0,0,0]), n('split','split',[0,0,-50]),
    n('cp','checkpoint',[0,0,-100]), n('finish','finish',[0,0,-200])],
  edges:[e('entry','start','split',[[0,0,0],[0,0,-50]]),
    e('road','split','cp',[[0,0,-50],[0,0,-100]]),
    e('air','split','cp',[[0,0,-50],[0,40,-75],[0,0,-100]],'flight'),
    e('final','cp','finish',[[0,0,-100],[0,0,-200]])],
  checkpoints:['cp'], groundRoute:['entry','road','final'],
};
const motion = (state,toS,extra={}) => ({
  edgeId:state.currentEdgeId, fromS:state.localS, toS,
  fromPosition:courseTravelPosition(graph,state),
  toPosition:courseTravelPosition(graph,{...state,localS:Math.min(toS,routeLength(graph,state.currentEdgeId))}),
  maxStepMetres:Math.max(0,toS-state.localS)+2, ...extra,
});

test('authoritative measured-position step API exists',()=>assert.equal(typeof advanceMeasuredCourseTravel,'function'));
test('verified on-road measured motion updates physical arc distance and lateral/altitude',()=>{
  let s={...createCourseTravel(graph),localS:10};
  s=advanceMeasuredCourseTravel(graph,s,motion(s,16));
  assert.equal(s.currentEdgeId,'entry');assert.equal(s.localS,16);
  const steered=advanceMeasuredCourseTravel(graph,s,motion(s,20,{toPosition:[2,1,-20],maxStepMetres:6}));
  assert.ok(Math.abs(steered.lateral-2)<1e-5);
  assert.ok(Math.abs(steered.altitude-1)<1e-5);
  assert.ok(Math.abs(courseTravelPosition(graph,steered)[0]-2)<1e-5);
});
test('actual forward signed gate crossing changes edges and records a mandatory checkpoint',()=>{
  let s={...createCourseTravel(graph),localS:48};
  s=advanceMeasuredCourseTravel(graph,s,motion(s,51,{toPosition:[0,0,-51],nextEdgeId:'road',maxStepMetres:4}));
  assert.equal(s.currentEdgeId,'road');assert.equal(s.nextCheckpoint,0);assert.ok(Math.abs(s.localS-1)<1e-4);
  s={...s,localS:48};
  s=advanceMeasuredCourseTravel(graph,s,motion(s,51,{toPosition:[0,0,-101],nextEdgeId:'final',maxStepMetres:4}));
  assert.equal(s.currentEdgeId,'final');assert.equal(s.nextCheckpoint,1);assert.equal(s.finished,false);
  s={...s,localS:98};
  s=advanceMeasuredCourseTravel(graph,s,motion(s,101,{toPosition:[0,0,-201],maxStepMetres:4}));
  assert.equal(s.finished,true);assert.equal(s.localS,100);
});
test('scalar progress without matching physical world displacement never advances',()=>{
  const s={...createCourseTravel(graph),localS:10};
  for (const extra of [{toPosition:[0,0,-10]}, {toPosition:[0,0,-14]},
    {fromPosition:[0,0,-60]}, {toPosition:[0,0,-60]}, {fromS:0}, {edgeId:'final'}])
    assert.deepEqual(advanceMeasuredCourseTravel(graph,s,motion(s,16,extra)),s);
});
test('out-of-road, high-altitude and nonfinite poses are rejected rather than counted as checkpoints',()=>{
  const s={...createCourseTravel(graph),currentEdgeId:'road',localS:48};
  for(const extra of [{toPosition:[11,0,-101]}, {toPosition:[0,12,-101]},
    {toPosition:[NaN,0,-101]}, {toPosition:[0,Infinity,-101]}])
    assert.deepEqual(advanceMeasuredCourseTravel(graph,s,motion(s,51,{...extra,nextEdgeId:'final',maxStepMetres:20})),s);
});
test('wrong direction, disconnected branch, unauthorized flight, and finish skip cannot be accepted',()=>{
  const start={...createCourseTravel(graph),localS:48};
  for(const extra of [{toPosition:[0,0,-47]}, {nextEdgeId:'final'}, {nextEdgeId:'air'}])
    assert.deepEqual(advanceMeasuredCourseTravel(graph,start,motion(start,51,{...extra,toPosition:extra.toPosition??[0,0,-51]})),start);
  const forged={...start,currentEdgeId:'final',localS:98};
  assert.deepEqual(advanceMeasuredCourseTravel(graph,forged,motion(forged,101,{toPosition:[0,0,-201]})),forged);
});
test('authorized aerial route preserves physical world altitude, then lands into the checkpoint',()=>{
  const s={...createCourseTravel(graph),localS:48};
  const entered=advanceMeasuredCourseTravel(graph,s,motion(s,51,{toPosition:sampleRoute(graph,'air',1).point,nextEdgeId:'air',flightAuthorized:true}));
  assert.equal(entered.currentEdgeId,'air');
  const inAir={...entered,localS:routeLength(graph,'air')/2};
  const climbed=advanceMeasuredCourseTravel(graph,inAir,motion(inAir,inAir.localS+3,{flightAuthorized:true,maxStepMetres:4}));
  assert.equal(climbed.currentEdgeId,'air');assert.ok(courseTravelPosition(graph,climbed)[1]>10);
  const nearEnd={...entered,localS:routeLength(graph,'air')-2};
  const landed=advanceMeasuredCourseTravel(graph,nearEnd,motion(nearEnd,routeLength(graph,'air')+1,{
    toPosition:[0,0,-101],nextEdgeId:'final',flightAuthorized:true,maxStepMetres:5}));
  assert.equal(landed.currentEdgeId,'final');assert.equal(landed.nextCheckpoint,1);
});
test('nonfinite or oversized movement budget and mismatched fromS reject unsafe step',()=>{
  const s={...createCourseTravel(graph),localS:10};
  for(const extra of [{toS:NaN}, {toS:Infinity}, {toS:9}, {maxStepMetres:Infinity},
    {maxStepMetres:0}, {maxStepMetres:2}, {fromS:8}])
    assert.deepEqual(advanceMeasuredCourseTravel(graph,s,motion(s,16,extra)),s);
});
test('independent measured updates at 30/60/120 Hz reach the same exact position without fake gates',()=>{
  for(const hz of [30,60,120]){
    let state=createCourseTravel(graph);
    const metres=30/(hz*2);
    for(let i=0;i<2*hz;i++)state=advanceMeasuredCourseTravel(graph,state,motion(state,state.localS+metres,{maxStepMetres:metres+1e-7}));
    assert.equal(state.currentEdgeId,'entry');assert.ok(Math.abs(state.localS-30)<1e-4);
    assert.ok(Math.abs(courseTravelPosition(graph,state)[2]+30)<1e-4);
  }
});

test('finish gate refuses a supplied next edge even if the signed sweep is valid',()=>{
  const s={...createCourseTravel(graph),currentEdgeId:'final',localS:98,nextCheckpoint:1};
  assert.deepEqual(advanceMeasuredCourseTravel(graph,s,motion(s,101,{toPosition:[0,0,-201],nextEdgeId:'entry',maxStepMetres:4})),s);
});

test('authorized flight over an ordinary ground edge can advance, but cannot bypass a high checkpoint',()=>{
  const high={...createCourseTravel(graph),currentEdgeId:'road',localS:10,altitude:10};
  const flight=motion(high,16,{flightAuthorized:true,maxStepMetres:7});
  assert.equal(advanceMeasuredCourseTravel(graph,high,flight).localS,16);
  assert.deepEqual(advanceMeasuredCourseTravel(graph,high,{...flight,flightAuthorized:false}),high);
  const atGate={...high,localS:48};
  const bypass=motion(atGate,51,{flightAuthorized:true,toPosition:[0,10,-101],nextEdgeId:'final',maxStepMetres:4});
  assert.deepEqual(advanceMeasuredCourseTravel(graph,atGate,bypass),atGate);
});
