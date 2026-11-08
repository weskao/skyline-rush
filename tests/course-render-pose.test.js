import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNE_TEMPEST_RACE } from '../src/courses/dune-tempest-race.ts';
import { createCourseRuntime, placeCourseCar } from '../src/course-race.ts';
import { chooseBranchByLateral } from '../src/course-race.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { graphOrigin, graphCarVisual, graphLookAhead, graphFinishVisual } from '../src/course-render-pose.ts';

const graph = DUNE_TEMPEST_RACE.graph;
function runtime() {
  return createCourseRuntime(DUNE_TEMPEST_RACE, [
    { id:'YOU',distance:24,x:2.5 }, { id:'NOVA',distance:26,x:-2.5 },
  ]);
}

test('graph car pose is in the exact canonical road frame, not legacy 1D metres', () => {
  const rt = runtime(), origin = graphOrigin(rt), car = rt.cars.get('YOU');
  const view = graphCarVisual(rt,'YOU',origin);
  const frame = sampleRoute(graph,car.travel.currentEdgeId,car.travel.localS);
  assert.ok(Math.hypot(...view.position.map((v,i) => v - frame.right[i] * car.travel.lateral)) < 1e-6);
  assert.strictEqual(view.frame, car.pose, 'shared pose, not a second simulator');
  assert.equal(view.separation,0);
  assert.equal(graphCarVisual(rt,'missing',origin),null);
});

test('equal odometer on two separated branches renders two different physical car positions', () => {
  const rt = runtime(), left = 'winding-wadi', right = 'dune-crest-cut', metres = 280;
  placeCourseCar(rt,'YOU',left,metres,{distance:2000,x:0,altitude:0});
  placeCourseCar(rt,'NOVA',right,metres,{distance:2000,x:0,altitude:0});
  const view = graphCarVisual(rt,'NOVA',graphOrigin(rt));
  assert.ok(view.separation>10,'parallel physical roads must stay separated');
});

test('camera look-ahead follows selected branch after the authored fork', () => {
  const rt = runtime();
  const edge = graph.edges.find(e => e.to === 'split1');
  assert.ok(edge);
  const length = routeLength(graph,edge.id);
  placeCourseCar(rt,'YOU',edge.id,length - 2,{distance:1500,x:-8,altitude:0});
  const chosen = chooseBranchByLateral(graph,edge.id,-8,2.5);
  const f = graphLookAhead(rt,-8,42);
  assert.equal(f.edgeId,chosen);
  const expected = sampleRoute(graph,chosen,40);
  assert.ok(Math.hypot(...f.point.map((v,i)=>v-expected.point[i]))<1e-6);
  const alternate = graphLookAhead(rt,8,42);
  assert.notEqual(alternate.edgeId,f.edgeId);
});

test('graph finish model is at the authored finish node in the shared physical projection', () => {
  const rt=runtime(), origin=graphOrigin(rt), finish=graphFinishVisual(rt,origin);
  assert.ok(Math.hypot(...finish.position.map((v,i)=>v+origin[i]-graph.nodes.find(n=>n.id===graph.finish).at[i]))<0.05);
  assert.ok(finish.separation>0);
});
