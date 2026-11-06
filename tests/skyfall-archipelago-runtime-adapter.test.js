import test from 'node:test';
import assert from 'node:assert/strict';
import { routeLength } from '../src/course-route-frame.ts';
import { validateCourseGraph } from '../src/course-graph.ts';
import {
  SKYFALL_COURSE, SKYFALL_GROUND_PATH, getSkyfallEdgeLength,
  hasSkyfallRoadContact, sampleSkyfallRoad,
} from '../src/courses/skyfall-archipelago.ts';
import { SKYFALL_GRAPH } from '../src/courses/skyfall-course-graph.ts';
import {
  PLAYABLE_COURSE_GRAPH, skyfallPhysicalDistance,
  sampleSkyfallRuntimeRoad, canTraverseSkyfallRoad,
} from '../src/courses/skyfall-archipelago-runtime-adapter.ts';

const state = (flightAuthorized = false, airborne = false, landing = false) =>
  ({ flightAuthorized, airborne, landing });
// Equivalent physical distances can differ by a few ULPs after conversion.
// Never quantize simulation positions or safety-critical contact/flight gates.
const BANK_TOLERANCE = 1e-12;

test('reuse validated graph, preserve all mandatory merges and complete ground fallback', () => {
  const graph = PLAYABLE_COURSE_GRAPH;
  assert.equal(graph, SKYFALL_GRAPH);
  assert.equal(validateCourseGraph(graph), graph);
  assert.deepEqual(graph.groundRoute, [...SKYFALL_GROUND_PATH]);
  assert.deepEqual(graph.checkpoints, ['a-merge', 'b-merge', 'c-merge']);
  assert.deepEqual(SKYFALL_COURSE.checkpoints, [...graph.checkpoints, graph.finish]);
  for (const id of graph.groundRoute) {
    const length = routeLength(graph, id);
    for (let i = 0; i <= 40; i++) {
      const s = length * i / 40;
      assert.equal(sampleSkyfallRuntimeRoad(id, s).roadContact, true, `${id} ${s}`);
      if (i) assert.equal(canTraverseSkyfallRoad(id, length * (i-1) / 40, s, state()), true, id);
    }
  }
});

test('runtime positions, altitude, bank and frames exactly reuse physical world sampler', () => {
  for (const edge of SKYFALL_COURSE.edges) {
    const graphLength = routeLength(PLAYABLE_COURSE_GRAPH, edge.id);
    for (const fraction of [0, 0.13, 0.39, 0.68, 0.94, 1]) {
      const s = graphLength * fraction;
      const actual = sampleSkyfallRoad(edge.id, getSkyfallEdgeLength(edge.id) * fraction);
      const runtime = sampleSkyfallRuntimeRoad(edge.id, s);
      for (const [got, expected] of [
        [runtime.point, [actual.point.x, actual.point.y, actual.point.z]],
        [runtime.forward, actual.forward], [runtime.right, actual.right], [runtime.up, actual.up],
      ]) for (let i = 0; i < 3; i++) {
        assert.ok(Math.abs(got[i] - expected[i]) < 1e-6, `${edge.id} coordinate ${i}`);
      }
      assert.ok(Math.abs(runtime.bank - actual.bank) < BANK_TOLERANCE,
        `${edge.id} bank drift: ${Math.abs(runtime.bank - actual.bank)} radians`);
      assert.equal(runtime.width, edge.width);
      assert.equal(runtime.roadContact, hasSkyfallRoadContact(edge.id, runtime.physicalS));
    }
    assert.ok(Math.abs(skyfallPhysicalDistance(edge.id, graphLength) - getSkyfallEdgeLength(edge.id)) < 1e-7);
  }
});

test('broken bridges do not become continuous asphalt; unauthorized flight cannot cross', () => {
  for (const edge of SKYFALL_COURSE.edges.filter(e => e.mode === 'air')) {
    assert.ok(edge.gaps.length > 0, edge.id);
    const scale = routeLength(PLAYABLE_COURSE_GRAPH, edge.id) / getSkyfallEdgeLength(edge.id);
    for (const gap of edge.gaps) {
      const before = (gap.from - 1) * scale;
      const inside = ((gap.from + gap.to) / 2) * scale;
      const after = (gap.to + 1) * scale;
      assert.equal(sampleSkyfallRuntimeRoad(edge.id, inside).roadContact, false, edge.id);
      assert.equal(canTraverseSkyfallRoad(edge.id, before, after, state()), false, edge.id);
      assert.equal(canTraverseSkyfallRoad(edge.id, before, after, state(true, false)), false, edge.id);
      assert.equal(canTraverseSkyfallRoad(edge.id, before, after, state(true, true)), true, edge.id);
      assert.equal(canTraverseSkyfallRoad(edge.id, before, inside, state(true, true, true)), false, edge.id);
      assert.equal(canTraverseSkyfallRoad(edge.id, before, after, state(true, true, true)), true, edge.id);
    }
  }
});

test('invalid, reversed, overshot and unauthorized segments fail closed', () => {
  const id = 'a-ground', length = routeLength(PLAYABLE_COURSE_GRAPH, id);
  for (const [from, to] of [[-1, 4], [10, 9], [3, length + 1], [NaN, 5], [0, Infinity]]) {
    assert.equal(canTraverseSkyfallRoad(id, from, to, state()), false);
  }
  assert.equal(canTraverseSkyfallRoad('unknown', 0, 5, state()), false);
  assert.equal(canTraverseSkyfallRoad(id, 0, 10, state(false, true)), false);
  assert.throws(() => skyfallPhysicalDistance(id, NaN), RangeError);
});
