import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';

const graph=points=>({edges:[{id:'ramp',from:'start',to:'finish',points,width:24,mode:'ground'}]});
const dot=(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0);
const verticalRamps=[
  [[0,0,0],[0,50,-12],[0,100,-40],[0,140,-140]],
  [[0,0,0],[0,70,-12],[0,130,-48],[0,170,-110]],
  [[0,170,-110],[0,130,-48],[0,70,-12],[0,0,0]],
];

test('the right/up road frame stays continuous when a ramp tangent crosses the near-vertical threshold',()=>{
  for(const points of verticalRamps){
    const g=graph(points),length=routeLength(g,'ramp');
    let prev=sampleRoute(g,'ramp',0);
    for(let i=1;i<=1000;i++){
      const next=sampleRoute(g,'ramp',length*i/1000);
      assert.ok(dot(prev.right,next.right)>0.9,`road-right flips near ${length*i/1000}m: ${prev.right} -> ${next.right}`);
      assert.ok(dot(prev.up,next.up)>0.9,`road-up flips near ${length*i/1000}m: ${prev.up} -> ${next.up}`);
      for(const frame of [next]){
        assert.ok(Math.abs(dot(frame.forward,frame.right))<1e-6);
        assert.ok(Math.abs(dot(frame.forward,frame.up))<1e-6);
        assert.ok(Math.abs(dot(frame.up,frame.right))<1e-6);
      }
      prev=next;
    }
  }
});
