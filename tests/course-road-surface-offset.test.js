import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseRoadGeometry } from '../src/course-road-geometry.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
const graph={edges:[{id:'slope',from:'start',to:'finish',width:20,mode:'ground',points:[[0,0,0],[0,50,-50]]}]};
const near=(a,b)=>Math.abs(a-b)<1e-4;

test('road ribbons offset along the sampled 3D road normal, preserving physical car-road contact on slopes',()=>{
  const length=routeLength(graph,'slope');
  const geometry=courseRoadGeometry(graph,'slope',{step:length,lift:3});
  const attr=geometry.getAttribute('position');
  for(let i=0;i<=1;i++){
    const frame=sampleRoute(graph,'slope',i*length);
    const center=[(attr.getX(i*2)+attr.getX(i*2+1))/2,
      (attr.getY(i*2)+attr.getY(i*2+1))/2,
      (attr.getZ(i*2)+attr.getZ(i*2+1))/2];
    for(let axis=0;axis<3;axis++)
      assert.ok(near(center[axis],frame.point[axis]+frame.up[axis]*3),`axis ${axis}: ${center} vs ${frame.up}`);
  }
});
