import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS } from '../src/game.js';
import { trackPoint, trackFrame, trackOverview } from '../src/track-paths.js';
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
