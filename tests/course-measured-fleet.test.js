import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCourseTravel, courseTravelPosition } from '../src/course-travel.ts';
import { routeLength } from '../src/course-route-frame.ts';
const { advanceMeasuredCourseFleet } = await import('../src/course-measured-fleet.ts').catch(()=>({}));
const n=(id,kind,at)=>({id,kind,at});
const e=(id,from,to,points,mode='ground')=>({id,from,to,points,width:24,mode});
const graph={id:'fleet',version:1,start:'start',finish:'finish',
  nodes:[n('start','start',[0,0,0]),n('split','split',[0,0,-50]),n('cp','checkpoint',[0,0,-100]),n('finish','finish',[0,0,-200])],
  edges:[e('approach','start','split',[[0,0,0],[0,0,-50]]),
    e('safe','split','cp',[[0,0,-50],[0,0,-100]]),
    e('air','split','cp',[[0,0,-50],[0,40,-75],[0,0,-100]],'flight'),
    e('final','cp','finish',[[0,0,-100],[0,0,-200]])],
  checkpoints:['cp'],groundRoute:['approach','safe','final']};
const ids=Array.from({length:8},(_,i)=>`car-${i}`);
const create=()=>ids.map(id=>({id,travel:createCourseTravel(graph)}));
const move=(car,toS,extra={})=>({id:car.id,motion:{
  edgeId:car.travel.currentEdgeId,fromS:car.travel.localS,toS,
  fromPosition:courseTravelPosition(graph,car.travel),
  toPosition:courseTravelPosition(graph,{...car.travel,localS:Math.min(toS,routeLength(graph,car.travel.currentEdgeId))}),
  maxStepMetres:Math.max(0,toS-car.travel.localS)+2,...extra}});

test('the measured eight-car fleet adapter exists',()=>assert.equal(typeof advanceMeasuredCourseFleet,'function'));
test('eight independent drivers advance only from verified physical world poses',()=>{
  const cars=create();const next=advanceMeasuredCourseFleet(graph,cars,cars.slice(0,4).map((c,i)=>move(c,i+5)));
  assert.deepEqual(next.map(c=>c.travel.localS),[5,6,7,8,0,0,0,0]);
  assert.ok(cars.every(c=>c.travel.localS===0));
});
test('unknown or duplicated IDs reject a frame before modifying any driver',()=>{
  const cars=create();
  assert.throws(()=>advanceMeasuredCourseFleet(graph,cars,[move(cars[0],5),move(cars[0],6)]),/duplicate/i);
  assert.throws(()=>advanceMeasuredCourseFleet(graph,cars,[move(cars[0],5),{...move(cars[1],5),id:'other'}]),/unknown/i);
  assert.ok(cars.every(c=>c.travel.localS===0));
});
test('one forged or invalid vehicle sweep prevents any partial fleet progression',()=>{
  const cars=create(),valid=move(cars[0],6);
  for(const motion of [{fromPosition:[0,0,-80]}, {toPosition:[0,0,-30]}, {maxStepMetres:NaN}]) {
    const bad={...move(cars[1],5),motion:{...move(cars[1],5).motion,...motion}};
    assert.equal(advanceMeasuredCourseFleet(graph,cars,[valid,bad]),cars);
  }
});
test('cars independently cross a physically signed checkpoint, while others stay on their own route',()=>{
  const cars=create().map((c,i)=>i<2?{...c,travel:{...c.travel,currentEdgeId:'safe',localS:48}}:c);
  const updated=advanceMeasuredCourseFleet(graph,cars,[move(cars[0],51,{toPosition:[0,0,-101],nextEdgeId:'final'}),move(cars[1],49)]);
  assert.equal(updated[0].travel.currentEdgeId,'final');
  assert.equal(updated[0].travel.nextCheckpoint,1);
  assert.equal(updated[1].travel.currentEdgeId,'safe');
  assert.equal(updated[1].travel.nextCheckpoint,0);
  assert.equal(updated[2].travel.currentEdgeId,'approach');
});
test('a missing flight authorization cannot drive an AI car through an aerial fork',()=>{
  const cars=create().map((c,i)=>i===0?{...c,travel:{...c.travel,localS:48}}:c);
  const unauthorized=advanceMeasuredCourseFleet(graph,cars,[move(cars[0],51,{toPosition:[0,0,-51],nextEdgeId:'air'})]);
  assert.equal(unauthorized,cars);
  const authorized=advanceMeasuredCourseFleet(graph,cars,[move(cars[0],51,{toPosition:[0,0,-51],nextEdgeId:'air',flightAuthorized:true})]);
  assert.equal(authorized[0].travel.currentEdgeId,'air');
  assert.equal(authorized[1].travel.localS,0);
});
test('finished cars and cars without a motion retain existing immutable state',()=>{
  const cars=create().map((c,i)=>i===0?{...c,travel:{...c.travel,finished:true}}:c);
  const updated=advanceMeasuredCourseFleet(graph,cars,[move(cars[0],10),move(cars[1],10)]);
  assert.equal(updated[0],cars[0]);
  assert.equal(updated[7],cars[7]);
  assert.equal(updated[1].travel.localS,10);
});

test('a forged stationary position also rejects the whole fleet frame',()=>{
  const cars=create();
  const forged=move(cars[1],0,{toPosition:[0,0,-50],maxStepMetres:2});
  assert.equal(advanceMeasuredCourseFleet(graph,cars,[move(cars[0],5),forged]),cars);
});
