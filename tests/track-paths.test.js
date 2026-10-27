import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/game.js';
import { trackPoint, trackFrame, trackOverview } from '../src/track-paths.ts';
const close=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);

test('legacy courses preserve their existing road centreline',()=>{
  for(const id of ['coast','neon','canyon','aurora']){
    const p=trackPoint(id,1000);
    close(p.x,Math.sin(1000/270)*18+Math.sin(1000/610)*25);
    close(p.y,0);close(p.z,-1000);
  }
});
test('spiral is a true 360-degree elevated turn',()=>{
  const a=trackPoint('spiral',1100),middle=trackPoint('spiral',1650),b=trackPoint('spiral',2200);
  close(a.x,b.x,1e-5); close(a.z,b.z,1e-5);
  assert.ok(middle.x>a.x+300);close(b.y-a.y,82,1e-5);
});
test('public overview uses only the centreline across every course',()=>{
  for(const id of Object.keys(RACE_TRACKS)){
    const points=trackOverview(id,128);
    assert.equal(points.length,128);
    assert.equal(points[0].distance,0);
    assert.equal(points.at(-1).distance,RACE_TRACKS[id].length);
    for(const p of points){
      for(const c of ['x','y'])assert.ok(Number.isFinite(p[c])&&p[c]>=0&&p[c]<=1,id);
      assert.ok(Number.isFinite(p.distance));
      assert.deepEqual(Object.keys(p).sort(),['distance','x','y']);
    }
    assert.deepEqual(points,trackOverview(id,128));
  }
});
test('world frame is orthonormal and has finite vectors',()=>{
  for(const id of Object.keys(RACE_TRACKS)){
    for(const distance of [0,80,980,RACE_TRACKS[id].length-20]){
      const {point,forward,right,up}=trackFrame(id,distance);
      for(const v of [forward,right,up])close(Math.hypot(...v),1,1e-6);
      close(forward.reduce((sum,n,i)=>sum+n*right[i],0),0,1e-6);
      close(forward.reduce((sum,n,i)=>sum+n*up[i],0),0,1e-6);
      assert.ok(Object.values(point).every(Number.isFinite));
    }
  }
});
test('unknown track IDs fail clearly and distance clamps',()=>{
  assert.throws(()=>trackPoint('not-a-track',42),/track/i);
  assert.deepEqual(trackPoint('coast',-4),trackPoint('coast',0));
  assert.deepEqual(trackPoint('coast',999999),trackPoint('coast',5000));
});

test('old four course outlines are visually legible instead of a one-pixel line',()=>{
  for(const id of ['coast','neon','canyon','aurora']){
    const points=trackOverview(id,128);
    const xs=points.map(p=>p.x);
    const ys=points.map(p=>p.y);
    assert.ok(Math.max(...xs)-Math.min(...xs)>=.70,`${id} lateral turns must be readable`);
    assert.ok(Math.max(...ys)-Math.min(...ys)>=.82,`${id} must show full start-to-finish length`);
    assert.ok(new Set(xs.map(x=>x.toFixed(3))).size>20,`${id} curves need shape detail`);
  }
});
test("Sky Spiral's real 360-degree helix is visibly large on its full-course map",()=>{
  const samples=trackOverview('spiral',257);
  const loop=samples.filter(p=>p.distance>=1100&&p.distance<=2200);
  assert.ok(Math.max(...loop.map(p=>p.x))-Math.min(...loop.map(p=>p.x))>.5);
  assert.ok(Math.max(...loop.map(p=>p.y))-Math.min(...loop.map(p=>p.y))>.26);
  const start=samples[0],end=samples.at(-1);
  assert.ok(start.y<.1&&end.y>.9);
  assert.ok(loop.some(p=>p.x>.6)&&loop.some(p=>p.y<.3));
});
