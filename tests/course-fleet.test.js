import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { courseTravelPosition, advanceCourseTravel, createCourseTravel } from '../src/course-travel.ts';
const fleetModule = await import('../src/course-fleet.ts').catch(() => ({}));
const { createCourseFleet, advanceCourseFleet, recoverCourseFleetCar, courseFleetContactPairs } = fleetModule;

const n = (id, kind, at) => ({ id, kind, at });
const e = (id, from, to, points, mode = 'ground') => ({ id, from, to, points, width: 20, mode });
const graph = validateCourseGraph({
  id: 'multi-car', version: 1, start: 'start', finish: 'finish',
  nodes: [n('start', 'start', [0,0,0]), n('split', 'split', [0,0,-100]),
    n('merge', 'merge', [0,0,-300]), n('cp', 'checkpoint', [0,0,-400]),
    n('finish','finish',[0,0,-500])],
  edges: [e('start','start','split',[[0,0,0],[0,0,-100]]),
    e('safe','split','merge',[[0,0,-100],[0,0,-300]]),
    e('air','split','merge',[[0,0,-100],[0,50,-200],[0,0,-300]],'flight'),
    e('gate','merge','cp',[[0,0,-300],[0,0,-400]]),
    e('finish-road','cp','finish',[[0,0,-400],[0,0,-500]])],
  groundRoute: ['start','safe','gate','finish-road'], checkpoints: ['cp'],
});
const ids = Array.from({length: 8},(_,i)=>`driver-${i}`);

test('fleet API is present before implementing a new race mode', () => {
  for (const fn of [createCourseFleet, advanceCourseFleet, recoverCourseFleetCar, courseFleetContactPairs])
    assert.equal(typeof fn,'function');
});
test('eight cars receive isolated state; duplicate or malformed identifiers are rejected', () => {
  const fleet=createCourseFleet(graph,ids);
  assert.equal(fleet.length,8);
  assert.equal(new Set(fleet.map(c=>c.id)).size,8);
  assert.ok(fleet.every(c=>c.travel.currentEdgeId==='start' && c.travel.nextCheckpoint===0));
  for(const list of [[], ['same','same'], ['bad',''], Array.from({length:9},(_,i)=>String(i))])
    assert.throws(()=>createCourseFleet(graph,list), /driver|car|id|eight|duplicate/i);
});
test('authoritative physical metres advance only intended racer; flights require permission', () => {
  const original=createCourseFleet(graph,ids);
  const moved=advanceCourseFleet(graph,original,[
    {id:ids[0],metres:150},
    {id:ids[1],metres:100+routeLength(graph,'air')/2, choices:{split:'air'}, flightAuthorized:true},
    {id:ids[2],metres:150,choices:{split:'air'}},
  ]);
  assert.equal(moved[0].travel.currentEdgeId,'safe');
  assert.equal(moved[1].travel.currentEdgeId,'air');
  assert.equal(moved[2].travel.currentEdgeId,'start');
  assert.equal(moved[3].travel.localS,0);
  assert.equal(original[0].travel.localS,0);
  assert.equal(original[1].travel.currentEdgeId,'start');
});
test('invalid or duplicate commands cannot partially advance the fleet', () => {
  const original=createCourseFleet(graph,ids);
  for(const commands of [
    [{id:ids[0],metres:10},{id:ids[0],metres:10}],
    [{id:ids[0],metres:10},{id:'missing',metres:20}],
    [{id:ids[0],metres:10},{id:ids[1],metres:NaN}],
    [{id:ids[0],metres:10},{id:ids[1],metres:-4}],
  ]) assert.throws(()=>advanceCourseFleet(graph,original,commands),/duplicate|unknown|invalid|distance/i);
  assert.equal(original[0].travel.localS,0);
});
test('physically adjacent cars contact; different altitude and flight/ground layers do not', () => {
  const original=createCourseFleet(graph,ids);
  const close=original.map((c,i)=>({...c,travel:{...c.travel,localS:i===0?40:i===1?42:60+i*12}}));
  assert.ok(courseFleetContactPairs(graph,close).some(p=>p[0]===ids[0] && p[1]===ids[1]));
  const separated=close.map((c,i)=>i===1?{...c,travel:{...c.travel,altitude:15}}:c);
  assert.ok(!courseFleetContactPairs(graph,separated).some(p=>p.includes(ids[0])&&p.includes(ids[1])));
  const overflight=close.map((c,i)=>i===1?{...c,travel:{...c.travel,currentEdgeId:'air',localS:routeLength(graph,'air')/2}}:c);
  assert.ok(!courseFleetContactPairs(graph,overflight).some(p=>p.includes(ids[0])&&p.includes(ids[1])));
});
test('car pairs physically merging at a shared ground junction may contact across edge IDs', () => {
  const cars=createCourseFleet(graph,ids).slice(0,2).map((c,i)=>({...c,travel:{...c.travel,
    currentEdgeId:i===0?'safe':'gate',localS:i===0?routeLength(graph,'safe'):0}}));
  assert.deepEqual(courseFleetContactPairs(graph,cars),[[ids[0],ids[1]]]);
});
test('recovery before first checkpoint takes a verified clear ground pose, not a flying edge', () => {
  const fleet=createCourseFleet(graph,ids).map((c,i)=>i===0?{...c,travel:{...c.travel,currentEdgeId:'air',localS:70,altitude:35,lateral:5}}:c);
  const seen=[];
  const result=recoverCourseFleetCar(graph,fleet,ids[0],point=>{seen.push(point);return seen.length>=3;});
  assert.ok(result);
  const recovered=result[0].travel;
  assert.equal(recovered.currentEdgeId,'start');
  assert.equal(recovered.nextCheckpoint,0);
  assert.equal(recovered.localS,15);
  assert.equal(recovered.altitude,0);assert.equal(recovered.lateral,0);
  assert.deepEqual(seen.at(-1),courseTravelPosition(graph,recovered));
  assert.equal(fleet[0].travel.currentEdgeId,'air');
});
test('recovery after validated checkpoint retains its order and never respawns before it', () => {
  const fleet=createCourseFleet(graph,ids).map((c,i)=>i===0?{...c,travel:{...c.travel,currentEdgeId:'finish-road',localS:40,nextCheckpoint:1,altitude:10}}:c);
  const result=recoverCourseFleetCar(graph,fleet,ids[0],()=>true);
  assert.ok(result);
  assert.equal(result[0].travel.currentEdgeId,'finish-road');
  assert.equal(result[0].travel.nextCheckpoint,1);
  assert.equal(result[0].travel.localS,5);
  assert.equal(result[0].travel.altitude,0);
});
test('no collision-cleared recovery pose means no relocation; never reset a finished driver', () => {
  const fleet=createCourseFleet(graph,ids);
  assert.equal(recoverCourseFleetCar(graph,fleet,ids[0],()=>false),null);
  const done=fleet.map((c,i)=>i===0?{...c,travel:{...c.travel,finished:true}}:c);
  assert.equal(recoverCourseFleetCar(graph,done,ids[0],()=>true),null);
  assert.throws(()=>recoverCourseFleetCar(graph,fleet,'other',()=>true),/unknown/i);
});

test('non-finite steering or height cannot advance even on an ordinary road segment', () => {
  const initial=createCourseTravel(graph);
  for(const pose of [{lateral:Infinity},{lateral:NaN},{altitude:NaN},{altitude:-Infinity}]){
    const invalid={...initial,...pose};
    assert.deepEqual(advanceCourseTravel(graph,invalid,10),invalid);
  }
});
test('recovery clearance receives the candidate road state for collision and hazard queries', () => {
  const fleet=createCourseFleet(graph,ids);
  const inspected=[];
  const next=recoverCourseFleetCar(graph,fleet,ids[0],(point,travel)=>{
    assert.ok(travel);
    inspected.push({point,edge:travel.currentEdgeId,altitude:travel.altitude});
    return travel.currentEdgeId==='start' && travel.altitude===0;
  });
  assert.ok(next);
  assert.equal(inspected[0].edge,'start');
});
test('finished cars never produce contact candidates', () => {
  const fleet=createCourseFleet(graph,ids).slice(0,2).map((car,i)=>({...car,travel:{...car.travel,finished:i===0,localS:40}}));
  assert.deepEqual(courseFleetContactPairs(graph,fleet),[]);
});
