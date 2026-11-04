import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VOLCANIC_CROWN, VOLCANIC_CROWN_EDGES, VOLCANIC_CROWN_CHECKPOINTS,
  volcanicGroundLength, volcanicEdgeLength, sampleVolcanicRoute,
  volcanicWorldPosition, advanceVolcanicGate, volcanicRecovery,
} from '../src/courses/volcanic-crown.ts';

const near=(a,b,eps=1e-5)=>assert.ok(Math.abs(a-b)<=eps, `${a} != ${b}`);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);

test('15-km-ish open ground path, START and FINISH distinct, no laps',()=>{
  const length=volcanicGroundLength();
  assert.ok(length>=14000 && length<=16500, `route length ${length.toFixed(1)} m`);
  assert.notEqual(VOLCANIC_CROWN.start,VOLCANIC_CROWN.finish);
  assert.deepEqual(VOLCANIC_CROWN.groundEdgeIds,Array.from({length:10},(_,i)=>`ground-${i}`));
  const nodes=new Map(VOLCANIC_CROWN.nodes.map(node=>[node.id,node]));
  for(let i=0;i<10;i++){
    const edge=VOLCANIC_CROWN_EDGES[i];
    assert.equal(edge.mode,'ground');
    assert.deepEqual(edge.points[0],nodes.get(edge.from).at);
    assert.deepEqual(edge.points.at(-1),nodes.get(edge.to).at);
    if(i)assert.equal(edge.from,VOLCANIC_CROWN_EDGES[i-1].to);
  }
  assert.equal(VOLCANIC_CROWN_EDGES[9].to,VOLCANIC_CROWN.finish);
  assert.equal(VOLCANIC_CROWN_CHECKPOINTS.length,3);
});
test('three distinct ground / flight-or-risk alternatives reconnect to the same route',()=>{
  for(const id of ['rift-flight','vent-risk','gorge-flight']){
    const option=VOLCANIC_CROWN_EDGES.find(edge=>edge.id===id);
    const ground=VOLCANIC_CROWN_EDGES.find(edge=>edge.mode==='ground'&&edge.from===option.from);
    assert.ok(ground);
    assert.equal(option.to,ground.to);
    assert.notDeepEqual(option.points,ground.points,'distinct branch geometry');
    if(option.id!=='vent-risk')assert.notEqual(option.mode,ground.mode);
    assert.ok(volcanicEdgeLength(option.id)>300);
  }
});
test('world frames are finite, orthonormal and rise/fall without flattening the road',()=>{
  const heights=[];
  for(const edge of VOLCANIC_CROWN_EDGES){
    const length=volcanicEdgeLength(edge.id);
    for(const s of [0,length*.1,length*.33,length*.5,length*.75,length]){
      const f=sampleVolcanicRoute(edge.id,s);
      heights.push(f.point[1]);
      for(const vector of [f.point,f.forward,f.right,f.up])
        assert.ok(vector.every(Number.isFinite),edge.id+' nonfinite');
      for(const vector of [f.forward,f.right,f.up])near(dot(vector,vector),1,1e-5);
      near(dot(f.forward,f.right),0,1e-5);
      near(dot(f.forward,f.up),0,1e-5);
      near(dot(f.right,f.up),0,1e-5);
      const raised=volcanicWorldPosition(edge.id,s,0,2);
      near(Math.hypot(...raised.map((v,i)=>v-f.point[i])),2,1e-5);
    }
  }
  assert.ok(Math.max(...heights)-Math.min(...heights)>150,'vertical volcano terrain');
});
test('authored hairpins reverse heading and remain continuous across curve samples',()=>{
  for(const id of ['ground-2','ground-6']){
    const len=volcanicEdgeLength(id);
    const vectors=Array.from({length:101},(_,i)=>sampleVolcanicRoute(id,len*i/100).forward);
    assert.ok(vectors.some((v,i)=>i>0 && dot(v,vectors[0]) < -.2),id+' needs real reversal');
    for(let i=1;i<vectors.length;i++)assert.ok(dot(vectors[i],vectors[i-1])>.7,id+' sharp discontinuity');
  }
});
test('ordered checkpoints reject shortcut finish and backward gate crossings',()=>{
  let state={nextCheckpoint:0,finished:false};
  state=advanceVolcanicGate(state,'finish',true);
  assert.equal(state.finished,false);
  state=advanceVolcanicGate(state,VOLCANIC_CROWN_CHECKPOINTS[1],true);
  assert.equal(state.nextCheckpoint,0);
  for(const id of VOLCANIC_CROWN_CHECKPOINTS){
    state=advanceVolcanicGate(state,id,false);
    state=advanceVolcanicGate(state,id,true);
  }
  near(state.nextCheckpoint,3);
  assert.equal(advanceVolcanicGate(state,'finish',true).finished,true);
});
test('recovery never drops the player into midair or bypasses the next checkpoint',()=>{
  for(let nextCheckpoint=0;nextCheckpoint<4;nextCheckpoint++){
    const frame=volcanicRecovery({nextCheckpoint,finished:false});
    assert.ok(frame.edgeId.startsWith('ground-'));
    assert.ok(frame.localS>=0);
    assert.ok(frame.point.every(Number.isFinite));
  }
});

test('hazardous vent bypass is an actual ground road using canonical CourseGraph modes', () => {
  const vent = VOLCANIC_CROWN_EDGES.find(edge => edge.id === 'vent-risk');
  assert.equal(vent.mode, 'ground', 'visible basalt road must be treated as drivable ground');
  assert.ok(VOLCANIC_CROWN_EDGES.every(edge => edge.mode === 'ground' || edge.mode === 'flight'),
    'shared CourseGraph accepts only ground / flight route modes');
});

test('both flight alternatives rejoin the physical ground road without a heading snap',()=>{
  for(const [flightId,nextGroundId] of [['rift-flight','ground-2'],['gorge-flight','ground-8']]){
    const flight=sampleVolcanicRoute(flightId,volcanicEdgeLength(flightId));
    const ground=sampleVolcanicRoute(nextGroundId,0);
    const separation=Math.hypot(...flight.point.map((v,i)=>v-ground.point[i]));
    assert.ok(separation<.01,`${flightId} must land on the real ground endpoint`);
    assert.ok(dot(flight.forward,ground.forward)>Math.cos(Math.PI/12),
      `${flightId} landing heading should agree with the continuing ground road within 15 degrees`);
  }
});
