import test from 'node:test';
import assert from 'node:assert/strict';
import { courseRouteOverview, createCourseRouteProjection } from '../src/course-route-map.ts';
import { routeLength } from '../src/course-route-frame.ts';

const graph = {
  id:'fork', version:1, start:'start', finish:'finish', checkpoints:[],
  nodes:[{id:'start',at:[0,0,0]},{id:'fork',at:[0,0,-100]},{id:'merge',at:[0,0,-300]},{id:'finish',at:[0,0,-400]}],
  edges:[
    {id:'approach',from:'start',to:'fork',mode:'ground',width:26,points:[[0,0,0],[0,0,-100]]},
    {id:'safe',from:'fork',to:'merge',mode:'ground',width:26,points:[[0,0,-100],[80,0,-220],[0,0,-300]]},
    {id:'jump',from:'fork',to:'merge',mode:'flight',width:26,points:[[0,0,-100],[-90,30,-180],[0,0,-300]]},
    {id:'out',from:'merge',to:'finish',mode:'ground',width:26,points:[[0,0,-300],[0,0,-400]]},
  ],groundRoute:['approach','safe','out']
};

test('one polyline per authored edge, preserving ground and flight choices',()=>{
  const result=courseRouteOverview(graph,11);
  assert.deepEqual(result.map(x=>x.edgeId),graph.edges.map(e=>e.id));
  assert.deepEqual(result.map(x=>x.mode),graph.edges.map(e=>e.mode));
  assert.deepEqual(result.map(x=>x.ground),[true,true,false,true]);
  for(const route of result){assert.equal(route.points.length,11);for(const p of route.points) assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
});

test('fork and merge endpoints share exactly the same projected node and all points fit map',()=>{
  const result=courseRouteOverview(graph,17);
  const byId=Object.fromEntries(result.map(x=>[x.edgeId,x.points]));
  for(const id of ['safe','jump']){
    for(const [a,b] of [[byId.approach.at(-1),byId[id][0]],[byId[id].at(-1),byId.out[0]]]){
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-6,id+' shared node mismatch');
    }
  }
  for(const line of result)for(const p of line.points)assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);
  assert.notDeepEqual(byId.safe[8],byId.jump[8], 'split paths remain distinct on the map');
});

test('invalid point counts are safely bounded without rounding course geometry',()=>{
  const count=courseRouteOverview(graph,1);
  assert.ok(count.every(x=>x.points.length===2));
  const fallback=courseRouteOverview(graph,Number.NaN);
  assert.ok(fallback.every(x=>x.points.length===64));
});

test('live graph markers follow physically measured branches and polyline endpoints', () => {
  const map = createCourseRouteProjection(graph, 17);
  for (const line of map.lines) {
    const length = routeLength(graph, line.edgeId);
    for (const [s, point] of [[0, line.points[0]], [length, line.points.at(-1)]]) {
      const actual = map.marker(line.edgeId, s);
      assert.ok(Math.hypot(actual.x - point.x, actual.y - point.y) < 1e-9);
    }
  }
  const ground = map.marker('safe', routeLength(graph, 'safe') / 2);
  const flight = map.marker('jump', routeLength(graph, 'jump') / 2);
  assert.ok(Math.hypot(ground.x-flight.x, ground.y-flight.y) > 0.01, 'parallel routes differ');
  assert.throws(() => map.marker('missing', 0), RangeError);
});
