import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { createCourseFleet } from '../src/course-fleet.ts';
const api=await import('../src/course-ai-standings.ts').catch(()=>({}));
const { chooseCourseNextEdge, rankCourseFleet }=api;
const node=(id,kind,at)=>({id,kind,at});
const edge=(id,from,to,points,mode='ground')=>({id,from,to,points,mode,width:24});
const graph=validateCourseGraph({
  id:'eight-car-routing',version:1,start:'start',finish:'finish',
  nodes:[node('start','start',[0,0,0]),node('split','split',[0,0,-100]),
    node('merge','merge',[0,0,-300]),node('cp','checkpoint',[0,0,-400]),node('finish','finish',[0,0,-500])],
  edges:[edge('approach','start','split',[[0,0,0],[0,0,-100]]),
    edge('safe','split','merge',[[0,0,-100],[0,0,-300]]),
    edge('flight','split','merge',[[0,0,-100],[0,65,-200],[0,0,-300]],'flight'),
    edge('gate','merge','cp',[[0,0,-300],[0,0,-400]]),
    edge('finish-road','cp','finish',[[0,0,-400],[0,0,-500]])],
  groundRoute:['approach','safe','gate','finish-road'],checkpoints:['cp'],
});
const ids=Array.from({length:8},(_,i)=>`driver-${i}`);
const fleet=()=>createCourseFleet(graph,ids);
const place=(cars,i,edgeId,s,nextCheckpoint=0,finished=false)=>cars.map((car,j)=>
  j!==i?car:{...car,travel:{...car.travel,currentEdgeId:edgeId,localS:s,nextCheckpoint,finished}});

test('shared branch AI and race order APIs are present',()=>{
  assert.equal(typeof chooseCourseNextEdge,'function');
  assert.equal(typeof rankCourseFleet,'function');
});
test('no-flight AI always picks an eligible ground edge; no unknown or unrelated edge',()=>{
  for(let i=0;i<8;i++) assert.equal(chooseCourseNextEdge(graph,'split',i,false,4),'safe');
  assert.equal(chooseCourseNextEdge(graph,'finish',0,true,0),null);
  assert.equal(chooseCourseNextEdge(graph,'missing',0,true,0),null);
});
test('authorized eight-car AI spreads deterministically across ground/flight and keeps choices stable',()=>{
  const first=Array.from({length:8},(_,i)=>chooseCourseNextEdge(graph,'split',i,true,7));
  assert.ok(first.includes('safe')&&first.includes('flight'));
  assert.deepEqual(first,Array.from({length:8},(_,i)=>chooseCourseNextEdge(graph,'split',i,true,7)));
  assert.ok(first.every(id=>id==='safe'||id==='flight'));
});
test('unknown driver indexes or non-finite seeds cannot select a branch',()=>{
  for(const invalid of [-1,NaN,Infinity,1.5]) assert.equal(chooseCourseNextEdge(graph,'split',invalid,true,0),null);
  assert.equal(chooseCourseNextEdge(graph,'split',0,true,NaN),null);
});
test('the car that has passed a mandatory checkpoint ranks before cars that have not',()=>{
  let cars=fleet();
  cars=place(cars,0,'finish-road',5,1);
  cars=place(cars,1,'gate',90);
  cars=place(cars,2,'approach',99);
  const ranked=rankCourseFleet(graph,cars);
  assert.equal(ranked[0].id,ids[0]);
  assert.equal(ranked[1].id,ids[1]);
  assert.deepEqual(ranked.map(x=>x.place),[1,2,3,4,5,6,7,8]);
  assert.equal(cars[0].travel.nextCheckpoint,1);
});
test('on the same checkpoint stage, standings compare real edge remaining metres across alternate branches',()=>{
  let cars=fleet();
  cars=place(cars,0,'safe',100);
  cars=place(cars,1,'flight',100);
  const ranked=rankCourseFleet(graph,cars);
  assert.ok(ranked.find(x=>x.id===ids[0]).remainingMetres < ranked.find(x=>x.id===ids[1]).remainingMetres);
  assert.ok(ranked.findIndex(x=>x.id===ids[0]) < ranked.findIndex(x=>x.id===ids[1]));
});
test('finished car ranks ahead, sorted by verified finish times before active cars',()=>{
  let cars=fleet();
  cars=place(cars,0,'finish-road',routeLength(graph,'finish-road'),1,true);
  cars=place(cars,2,'finish-road',routeLength(graph,'finish-road'),1,true);
  cars=place(cars,1,'gate',95);
  const ranked=rankCourseFleet(graph,cars,{[ids[0]]:240,[ids[2]]:220});
  assert.deepEqual(ranked.slice(0,3).map(x=>x.id),[ids[2],ids[0],ids[1]]);
  assert.equal(ranked[0].finished,true);
});
test('ties remain stable, and invalid state cannot forge a higher standing',()=>{
  const cars=fleet();
  const first=rankCourseFleet(graph,cars);
  assert.deepEqual(first.map(x=>x.id),ids);
  const invalid=place(cars,0,'nonexistent',NaN,999);
  const ranked=rankCourseFleet(graph,invalid);
  assert.equal(ranked.at(-1).id,ids[0]);
});
test('a forged position past an uncollected checkpoint is excluded from valid standings',()=>{
  const forged=place(fleet(),0,'finish-road',25,0,false);
  const ranked=rankCourseFleet(graph,forged);
  const bad=ranked.find(x=>x.id===ids[0]);
  assert.equal(bad.nextCheckpoint,-1);
  assert.equal(bad.remainingMetres,Infinity);
  assert.equal(bad.place,8);
});
