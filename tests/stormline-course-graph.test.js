import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { STORMLINE_MEGACITY, edgeLength } from '../src/courses/stormline-megacity.ts';
import { STORMLINE_COURSE_GRAPH, sampleStormlineRoad, stormlineRoadLength } from '../src/courses/stormline-course-graph.ts';

test('Stormline authored edges adapt to the existing validated CourseGraph without a parallel runtime', () => {
  const graph = STORMLINE_COURSE_GRAPH;
  assert.equal(validateCourseGraph(graph), graph);
  assert.equal(graph.id, 'stormline-megacity');
  assert.equal(graph.edges.length, STORMLINE_MEGACITY.edges.length);
  assert.deepEqual(graph.groundRoute, STORMLINE_MEGACITY.mainRoute);
  assert.deepEqual(graph.checkpoints, ['a', 'c', 'f', 'h', 'j']);
  assert.equal(graph.edges.find(e => e.id === 'roof-flight').mode, 'flight');
  assert.equal(graph.edges.find(e => e.id === 'tunnel-cut').layer, 'tunnel');
  assert.equal(graph.edges.find(e => e.id === 'skyway-cut').layer, 'viaduct');
  assert.ok(graph.edges.filter(e => e.mode === 'ground').length === 14);
  assert.equal(graph.start, 'start');
  assert.equal(graph.finish, 'finish');
});

test('curved road sampling and length use the same shared arc-length frame at hairpin, tunnel and landing', () => {
  for (const id of ['hairpin-west', 'tunnel-cut', 'final-interchange', 'roof-flight']) {
    const length = stormlineRoadLength(id);
    assert.equal(length, routeLength(STORMLINE_COURSE_GRAPH, id));
    for (const ratio of [0, .2, .5, .8, 1]) {
      const frame = sampleRoute(STORMLINE_COURSE_GRAPH, id, length * ratio);
      const scenic = sampleStormlineRoad(id, length * ratio);
      assert.deepEqual(scenic.point, frame.point);
      assert.deepEqual(scenic.right, frame.right);
      assert.deepEqual(scenic.up, frame.up);
      for (const axis of [frame.forward, frame.right, frame.up]) {
        assert.ok(axis.every(Number.isFinite));
        assert.ok(Math.abs(Math.hypot(...axis) - 1) < 1e-6);
      }
    }
  }
  const west = STORMLINE_MEGACITY.edges.find(e => e.id === 'hairpin-west');
  assert.ok(stormlineRoadLength(west.id) > edgeLength(west) + 5, 'true curves must retain their extra length');
});
