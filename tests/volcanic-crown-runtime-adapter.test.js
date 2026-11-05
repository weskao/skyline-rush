import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength } from '../src/course-route-frame.ts';
import {
  PLAYABLE_COURSE_GRAPH as graph,
  VOLCANIC_CROWN_RUNTIME as runtime,
  VOLCANIC_CROWN_EDGES,
  sampleVolcanicRoute,
} from '../src/courses/volcanic-crown-runtime-adapter.ts';
import { volcanicWorldPosition } from '../src/courses/volcanic-crown.ts';

const edge = id => graph.edges.find(item => item.id === id);
const near = (a, b, epsilon = 1e-5) => assert.ok(Math.hypot(...a.map((n, i) => n - b[i])) <= epsilon);

test('RED: canonical graph keeps every authored fork and all mandatory checkpoints', () => {
  assert.equal(validateCourseGraph(graph), graph);
  assert.equal(graph.nodes.length, 11);
  assert.equal(graph.edges.length, 13);
  assert.deepEqual(graph.checkpoints, ['crater-hairpin', 'high-ridge', 'sprint']);
  assert.deepEqual(graph.groundRoute, Array.from({ length: 10 }, (_, i) => `ground-${i}`));
  for (const authored of VOLCANIC_CROWN_EDGES) {
    assert.equal(edge(authored.id), authored, `preserve actual ${authored.id} geometry and mode`);
  }
  assert.equal(edge('vent-risk').mode, 'ground', 'scene draws a physical road on the risk edge');
  for (const flight of ['rift-flight', 'gorge-flight']) assert.equal(edge(flight).mode, 'flight');
});

test('RED: road, race, scenery, hazard coordinates use identical arc-length geometry', () => {
  for (const authored of graph.edges) {
    const length = routeLength(graph, authored.id);
    assert.ok(length > 100);
    for (const s of [0, length * .25, length * .5, length * .75, length]) {
      const actual = runtime.sample(authored.id, s);
      near(actual.point, sampleVolcanicRoute(authored.id, s).point);
      near(actual.point, volcanicWorldPosition(authored.id, s));
      assert.ok(Number.isFinite(actual.curvature));
    }
    near(runtime.sample(authored.id, 0).point, authored.points[0]);
    near(runtime.sample(authored.id, length).point, authored.points.at(-1));
  }
  // Both crater-rim hairpins must retain their hand-authored extra bends.
  for (const hairpin of ['ground-2', 'ground-6']) assert.ok(edge(hairpin).points.length >= 5);
});

test('RED: safe ground traversal cannot bypass required ordered signed gates', () => {
  let progress = runtime.createProgress();
  for (const [i, id] of graph.groundRoute.entries()) {
    const current = edge(id), length = routeLength(graph, id);
    const nextEdgeId = graph.groundRoute[i + 1];
    progress = runtime.advanceProgress(progress, {
      edgeId: id, fromS: length - 1, toS: length + .5,
      position: runtime.sample(id, length).point, ...(nextEdgeId ? { nextEdgeId } : {}),
    });
    if (current.to === graph.checkpoints[0]) assert.equal(progress.nextCheckpoint, 1);
    if (current.to === graph.checkpoints[1]) assert.equal(progress.nextCheckpoint, 2);
    if (current.to === graph.checkpoints[2]) assert.equal(progress.nextCheckpoint, 3);
  }
  assert.equal(progress.finished, true);
  assert.equal(progress.nextCheckpoint, 3);
  assert.equal(runtime.gates.length, 4);
});

test('RED: airborne, backwards, wrong-edge and out-of-order gate attempts are rejected', () => {
  const initial = runtime.createProgress();
  const finish = edge('ground-9'), finishS = routeLength(graph, finish.id);
  const spoofFinish = { edgeId: finish.id, fromS: finishS - 1, toS: finishS + 1,
    position: runtime.sample(finish.id, finishS).point };
  assert.deepEqual(runtime.advanceProgress(initial, spoofFinish), initial);
  const cpEdge = edge('ground-2'), s = routeLength(graph, cpEdge.id);
  const point = runtime.sample(cpEdge.id, s).point;
  const state = { ...initial, currentEdgeId: cpEdge.id };
  const valid = { edgeId: cpEdge.id, fromS: s - 1, toS: s + 1,
    position: point, nextEdgeId: 'ground-3' };
  assert.equal(runtime.advanceProgress(state, valid).nextCheckpoint, 1);
  assert.deepEqual(runtime.advanceProgress(state, { ...valid, fromS: s + 1, toS: s - 1 }), state);
  assert.deepEqual(runtime.advanceProgress(state, { ...valid, edgeId: 'rift-flight' }), state);
  const up = runtime.sample(cpEdge.id, s).up;
  const airborne = point.map((n, i) => n + up[i] * 35);
  assert.deepEqual(runtime.advanceProgress(state, { ...valid, position: airborne }), state);
});

test('RED: recovery remains grounded and obstacle metadata matches sampled geometry', () => {
  for (let nextCheckpoint = 0; nextCheckpoint <= graph.checkpoints.length; nextCheckpoint++) {
    const frame = runtime.recovery({ nextCheckpoint, currentEdgeId: 'ground-9', finished: false });
    assert.equal(edge(frame.edgeId).mode, 'ground');
    assert.ok(frame.localS > 0 && frame.localS < routeLength(graph, frame.edgeId));
    near(runtime.sample(frame.edgeId, frame.localS).point, frame.point);
  }
  for (const item of runtime.obstacles) {
    const pose = runtime.obstaclePose(item, 4);
    assert.ok(item.s > 0 && item.s < runtime.edgeLength(item.edgeId));
    near(pose.point, volcanicWorldPosition(item.edgeId, item.s, item.lateral),
      item.kind === 'rockfall' ? 50 : 1e-5);
    assert.ok(item.radius > 0);
  }
});
