import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength } from '../src/course-route-frame.ts';
const travel = await import('../src/course-travel.ts').catch(() => ({}));
const { createCourseTravel, advanceCourseTravel, courseTravelPosition } = travel;
test('shared course travel API is present', () => {
  assert.equal(typeof createCourseTravel, 'function');
  assert.equal(typeof advanceCourseTravel, 'function');
  assert.equal(typeof courseTravelPosition, 'function');
});

const n = (id, kind, at) => ({id, kind, at});
const e = (id, from, to, points, mode='ground') => ({id,from,to,points,mode,width:20});
const graph = validateCourseGraph({
  id:'fixture',version:1,start:'start',finish:'finish',
  nodes:[n('start','start',[0,0,0]),n('split','split',[0,0,-100]),n('join','merge',[0,0,-300]),n('cp','checkpoint',[0,0,-400]),n('finish','finish',[0,0,-500])],
  edges:[e('start','start','split',[[0,0,0],[0,0,-100]]), e('safe','split','join',[[0,0,-100],[0,0,-300]]),e('flight','split','join',[[0,0,-100],[0,40,-200],[0,0,-300]],'flight'),e('checkpoint','join','cp',[[0,0,-300],[0,0,-400]]),e('finish-road','cp','finish',[[0,0,-400],[0,0,-500]])],
  groundRoute:['start','safe','checkpoint','finish-road'],checkpoints:['cp']
});
const total = ['start','safe','checkpoint','finish-road'].reduce((sum,id)=>sum+routeLength(graph,id),0);

test('metres move the vehicle on the active physical arc, without advancing checkpoints',()=>{
  let s=createCourseTravel(graph);
  assert.deepEqual(s,{currentEdgeId:'start',localS:0,lateral:0,altitude:0,nextCheckpoint:0,finished:false});
  s=advanceCourseTravel(graph,s,28);
  assert.equal(s.currentEdgeId,'start');assert.equal(s.localS,28);assert.equal(s.nextCheckpoint,0);
  assert.ok(Math.abs(courseTravelPosition(graph,s)[2]+28)<1e-6);
});
test('ground-only travel automatically follows the legal route across split, checkpoint and finish',()=>{
  const s=advanceCourseTravel(graph,createCourseTravel(graph),total+20);
  assert.equal(s.finished,true);assert.equal(s.nextCheckpoint,1);assert.equal(s.currentEdgeId,'finish-road');
  assert.equal(s.localS,routeLength(graph,'finish-road'));
  assert.deepEqual(courseTravelPosition(graph,s),[0,0,-500]);
});
test('explicit flight branch needs trusted flight permission and preserves physical checkpoint order',()=>{
  const x=advanceCourseTravel(graph,createCourseTravel(graph),100+routeLength(graph,'flight')/2,{split:'flight'});
  assert.equal(x.currentEdgeId,'start'); // reject invalid/unauthorized route, no half-applied update
  const y=advanceCourseTravel(graph,createCourseTravel(graph),100+routeLength(graph,'flight')/2,{split:'flight'},true);
  assert.equal(y.currentEdgeId,'flight');assert.equal(y.nextCheckpoint,0);assert.equal(y.finished,false);
  assert.ok(courseTravelPosition(graph,y)[1]>0);
  const z=advanceCourseTravel(graph,y,routeLength(graph,'flight')/2+201,{},true);
  assert.equal(z.finished,true);assert.equal(z.nextCheckpoint,1);
});
test('invalid next-edge selection and non-finite or reverse travel cannot advance',()=>{
  const s=createCourseTravel(graph);
  for(const d of [NaN,Infinity,-1,-Infinity]) assert.deepEqual(advanceCourseTravel(graph,s,d),s);
  assert.deepEqual(advanceCourseTravel(graph,s,150,{split:'finish-road'}),s);
  assert.deepEqual(advanceCourseTravel(graph,s,150,{split:'flight'}),s);
});
test('recovery-sized large time step equals successive finite 30/60/120 Hz travel on same ground path',()=>{
  const target=450;
  const once=advanceCourseTravel(graph,createCourseTravel(graph),target);
  for(const hz of [30,60,120]){
    let s=createCourseTravel(graph);
    for(let i=0;i<hz*5;i++) s=advanceCourseTravel(graph,s,target/(hz*5));
    assert.equal(s.finished,once.finished);
    assert.equal(s.currentEdgeId,once.currentEdgeId);
    assert.equal(s.nextCheckpoint,once.nextCheckpoint);
    assert.ok(Math.abs(s.localS-once.localS)<1e-6);
  }
});

test('world position projects lateral steering and vehicle height on the same 3D route frame',()=>{
  const state = {...createCourseTravel(graph),localS:50,lateral:4,altitude:2};
  const p = courseTravelPosition(graph,state);
  assert.ok(Math.abs(p[0]-4) < 1e-6);
  assert.ok(Math.abs(p[1]-2) < 1e-6);
  assert.ok(Math.abs(p[2]+50) < 1e-6);
  const moved = advanceCourseTravel(graph,state,5);
  assert.equal(moved.lateral,4); assert.equal(moved.altitude,2);
});
test('a high or far-off-road vehicle cannot claim a physical checkpoint by scalar travel', () => {
  const base = { ...createCourseTravel(graph), currentEdgeId: 'checkpoint', localS: 90 };
  for (const badPose of [{ altitude: 100 }, { lateral: 100 }]) {
    const pose = { ...base, ...badPose };
    assert.deepEqual(advanceCourseTravel(graph, pose, 20), pose);
  }
  const valid = advanceCourseTravel(graph, base, 20);
  assert.equal(valid.currentEdgeId, 'finish-road');
  assert.equal(valid.nextCheckpoint, 1);
});
test('eight independent cars may choose ground or authorized air without sharing checkpoint state', () => {
  const cars = Array.from({length: 8}, (_, i) =>
    advanceCourseTravel(graph, createCourseTravel(graph),
      100 + (i % 2 ? routeLength(graph,'flight') : routeLength(graph,'safe')) / 2,
      { split: i % 2 ? 'flight' : 'safe' }, Boolean(i % 2)));
  assert.equal(cars.length, 8);
  for (let i = 0; i < cars.length; i++) {
    assert.equal(cars[i].currentEdgeId, i % 2 ? 'flight' : 'safe');
    assert.equal(cars[i].nextCheckpoint, 0);
    assert.equal(cars[i].finished, false);
  }
  assert.deepEqual(createCourseTravel(graph), {currentEdgeId:'start',localS:0,lateral:0,altitude:0,nextCheckpoint:0,finished:false});
});
