import test from 'node:test';
import assert from 'node:assert/strict';
import { skyPoint, skyFrame, skyPosition } from '../src/sky-track.ts';

const FINISH=5600,START=900,LENGTH=1600,PERIOD=3800;
const delta=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
test('Sky Spiral Endless keeps the authored 5.6km exactly and repeats a gently connected 3D helix',()=>{
  for(const d of [0,1100,1650,2200,3000,5599,5600]){
    assert.deepEqual(skyPoint(d,true),skyPoint(d,false),'Sprint/Ghost must have identical canonical points');
  }
  for(const lap of [0,1,10,100]){
    const at=FINISH+lap*PERIOD+START;
    const a=skyPoint(at,true),middle=skyPoint(at+LENGTH/2,true),end=skyPoint(at+LENGTH,true);
    assert.ok(middle.x>a.x+100,'subsequent cycles must have a real lateral loop');
    assert.ok(middle.y>a.y+40,'subsequent cycles must climb, not remain flat');
    assert.ok(Math.abs(end.x-a.x)<1e-6 && Math.abs(end.y-a.y)<1e-6);
    for(const boundary of [at,at+LENGTH]){
      const left=skyPoint(boundary-.01,true),right=skyPoint(boundary+.01,true);
      assert.ok(delta(left,right)<.05,'must be C0 and nearly C1 at helix connection');
      const f=skyFrame(boundary,true);
      assert.ok(f.forward.every(Number.isFinite));
      assert.ok(f.up.every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(...f.right)-1)<.001);
    }
    for(const d of [at+10,at+640,at+LENGTH-10]){
      assert.ok(Math.hypot(...skyPosition(d,0,0,d,true))<1e-6,'car and road use the same infinite local origin');
    }
  }
});
