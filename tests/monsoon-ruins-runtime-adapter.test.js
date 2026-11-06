import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLE_COURSE_GRAPH as graph } from '../src/courses/monsoon-ruins-runtime-adapter.ts';
import {
  MONSOON_RUINS_COURSE, sampleMonsoonRoute, monsoonEdgeLength, sampleMonsoonEdge,
} from '../src/courses/monsoon-ruins.ts';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { advanceSignedGate } from '../src/course-signed-gates.ts';
import { createRouteProgress } from '../src/course-progress.ts';

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const edgeById = id => graph.edges.find(e => e.id === id);
const nodeById = id => graph.nodes.find(n => n.id === id);
const groundEdges = () => graph.groundRoute.map(edgeById);

test('RED: canonical directed topology, ordered six mandatory world-space gates and safe ground path', () => {
  assert.equal(validateCourseGraph(graph), graph);
  assert.equal(graph.start, 'start');
  assert.equal(graph.finish, 'finish');
  assert.equal(graph.checkpoints.length, MONSOON_RUINS_COURSE.checkpoints.length);
  assert.ok(graph.groundRoute.every(id => edgeById(id).mode === 'ground'));
  let current = graph.start;
  for (const edge of groundEdges()) {
    assert.equal(edge.from, current);
    current = edge.to;
  }
  assert.equal(current, graph.finish);
  for (const [index, id] of graph.checkpoints.entries()) {
    const gate = nodeById(id);
    assert.equal(gate.kind, 'checkpoint');
    assert.ok(distance(gate.at, sampleMonsoonRoute('ground', MONSOON_RUINS_COURSE.checkpoints[index]).point) < 1e-8);
    assert.ok(groundEdges().some(e => e.to === id));
  }
});

test('RED: physical branches preserve authored river, waterfall and canopy endpoints and elevation', () => {
  for (const branch of MONSOON_RUINS_COURSE.branches) {
    const edge = edgeById(branch.id);
    assert.ok(edge, branch.id);
    assert.equal(edge.from, branch.fromNode);
    assert.equal(edge.to, branch.toNode);
    assert.equal(edge.width, branch.width);
    assert.equal(edge.surface, branch.surface);
    assert.equal(edge.mode, branch.mode === 'air' ? 'flight' : 'ground');
    assert.ok(distance(edge.points[0], nodeById(edge.from).at) < 1e-8);
    assert.ok(distance(edge.points.at(-1), nodeById(edge.to).at) < 1e-8);
    const center = sampleMonsoonRoute(branch.id, (branch.from + branch.to) / 2).point;
    const ground = sampleMonsoonRoute('ground', (branch.from + branch.to) / 2).point;
    assert.ok(distance(center, ground) > 20, `${branch.id} must be physically distinct`);
    // Half of an authored distance parameter is NOT half of a winding 3D
    // arc length. Compare the independent source and canonical metre samplers.
    const referenceLength = monsoonEdgeLength(branch.id);
    const canonicalLength = routeLength(graph, edge.id);
    for (const fraction of [0.25, 0.5, 0.75]) {
      const reference = sampleMonsoonEdge(branch.id, referenceLength * fraction).point;
      const actual = sampleRoute(graph, edge.id, canonicalLength * fraction).point;
      const drift = distance(actual, reference);
      assert.ok(drift < 2, `${branch.id} at physical fraction ${fraction}: ${drift}m drift`);
    }
  }
});

test('RED: shared arc-length frames follow actual ground curves and hill elevations', () => {
  const anchors = [...new Set([...MONSOON_RUINS_COURSE.nodes.map(n => n.distance), ...MONSOON_RUINS_COURSE.checkpoints])].sort((a,b)=>a-b);
  const edges = groundEdges();
  assert.equal(edges.length, anchors.length - 1);
  for (const [index, edge] of edges.entries()) {
    const start = anchors[index], end = anchors[index + 1];
    const physical = routeLength(graph, edge.id);
    assert.ok(physical > 0);
    for (const t of [0, .25, .5, .75, 1]) {
      const f = sampleRoute(graph, edge.id, physical * t);
      // The authored scalar progresses proportionally to real ground arc-length.
      const original = sampleMonsoonRoute('ground', start + (end - start) * t).point;
      assert.ok(distance(f.point, original) < 2.5, `${edge.id} at ${t}: ${distance(f.point, original)}m`);
      assert.ok([...f.point, ...f.forward, ...f.up, ...f.right].every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(...f.forward) - 1) < 1e-5);
    }
  }
});

test('RED: altitude-aware signed checkpoint gate rejects flight-over and out-of-lane sweeps', () => {
  const first = groundEdges().find(edge => edge.to === graph.checkpoints[0]);
  assert.ok(first);
  const next = groundEdges().find(edge => edge.from === first.to);
  const length = routeLength(graph, first.id);
  const frame = sampleRoute(graph, first.id, length);
  const offset = (distanceForward, height, lateral = 0) => frame.point.map((v,i) =>
    v + frame.forward[i] * distanceForward + frame.up[i] * height + frame.right[i] * lateral);
  const state = createRouteProgress(graph);
  // Advance to the first gate only: it is located on the first ground edge.
  assert.equal(state.currentEdgeId, first.id);
  const sweep = (height, lateral = 0) => ({
    edgeId: first.id, fromS: length - 2, toS: length,
    fromPosition: offset(-2, height, lateral), toPosition: offset(1, height, lateral),
    nextEdgeId: next.id, maxStepMetres: 5,
  });
  assert.equal(advanceSignedGate(graph, state, sweep(20)), state);
  assert.equal(advanceSignedGate(graph, state, sweep(0, first.width)), state);
  const passed = advanceSignedGate(graph, state, sweep(0));
  assert.equal(passed.nextCheckpoint, 1);
  assert.equal(passed.currentEdgeId, next.id);
});

test('RED: every branch rejoins safe ground before subsequent required checkpoints', () => {
  for (const branch of MONSOON_RUINS_COURSE.branches) {
    const edge = edgeById(branch.id);
    const joining = groundEdges().find(e => e.from === branch.toNode);
    assert.ok(joining, `${branch.id} must have a ground landing/fallback continuation`);
    assert.ok(distance(edge.points.at(-1), joining.points[0]) < 1e-8);
    assert.ok(graph.checkpoints.some(id => groundEdges().some(e => e.to === id &&
      MONSOON_RUINS_COURSE.checkpoints[graph.checkpoints.indexOf(id)] > branch.to)));
  }
});

test('RED: mandatory checkpoint cannot be bypassed by a fabricated flight shortcut', () => {
  const from = graph.nodes.find(n => n.id === 'river-split');
  const finish = nodeById(graph.finish);
  const modified = {
    ...graph,
    edges: [...graph.edges, {
      id: 'invalid-air-shortcut', from: from.id, to: graph.finish,
      points: [from.at, finish.at], width: 22, mode: 'flight',
    }],
  };
  assert.throws(() => validateCourseGraph(modified), /checkpoint bypass/);
});
