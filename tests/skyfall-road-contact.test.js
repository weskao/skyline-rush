import test from 'node:test';
import assert from 'node:assert/strict';
import { SKYFALL_COURSE, getSkyfallEdgeLength, hasSkyfallRoadContact,
  sampleSkyfallRoad } from '../src/courses/skyfall-archipelago.ts';
import { SKYFALL_GRAPH } from '../src/courses/skyfall-course-graph.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { sampleSkyfallRuntimeRoad, skyfallPhysicalDistance } from '../src/courses/skyfall-archipelago-runtime-adapter.ts';

test('every Skyfall edge and lane is sampled from the shared physical frame without a bank offset', () => {
  for (const edge of SKYFALL_COURSE.edges) {
    const length = routeLength(SKYFALL_GRAPH,edge.id);
    assert.equal(getSkyfallEdgeLength(edge.id),length);
    for (let tenth=0;tenth<=10;tenth++) {
      const s=length*tenth/10, graph=sampleRoute(SKYFALL_GRAPH,edge.id,s);
      const rendered=sampleSkyfallRoad(edge.id,s), runtime=sampleSkyfallRuntimeRoad(edge.id,s);
      assert.equal(rendered.bank,0);
      assert.equal(runtime.bank,0);
      assert.equal(skyfallPhysicalDistance(edge.id,s),s);
      assert.deepEqual(runtime.right,graph.right);
      assert.deepEqual(runtime.up,graph.up);
      for (const lane of [-10.2,0,10.2]) {
        const road=[rendered.point.x+rendered.right[0]*lane,
          rendered.point.y+rendered.right[1]*lane,
          rendered.point.z+rendered.right[2]*lane];
        const physics=graph.point.map((p,i)=>p+graph.right[i]*lane);
        assert.ok(Math.hypot(...road.map((v,i)=>v-physics[i]))<=.05,
          `${edge.id} ${s} lane ${lane} has height/position mismatch`);
        const normalDot=rendered.up.reduce((sum,x,i)=>sum+x*graph.up[i],0);
        assert.ok(normalDot>=Math.cos(Math.PI/180),`${edge.id} bank/normal mismatch`);
      }
    }
    for (const gap of edge.gaps) {
      assert.equal(hasSkyfallRoadContact(edge.id,(gap.from+gap.to)/2),false);
      assert.equal(hasSkyfallRoadContact(edge.id,Math.max(0,gap.from-1)),true);
      assert.equal(hasSkyfallRoadContact(edge.id,Math.min(length,gap.to+1)),true);
    }
  }
});
