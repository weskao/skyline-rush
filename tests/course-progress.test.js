import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength } from '../src/course-route-frame.ts';

const progress = await import('../src/course-progress.ts').catch(() => ({}));
const node = (id, kind, at) => ({ id, kind, at });
const edge = (id, from, to, points, mode = 'ground') => ({ id, from, to, points, width: 28, mode });
const graph = validateCourseGraph({
  id: 'shared-graph', version: 1, start: 'start', finish: 'finish',
  nodes: [node('start', 'start', [0, 0, 0]), node('split', 'split', [0, 0, -100]),
    node('merge', 'merge', [0, 0, -300]), node('cp', 'checkpoint', [0, 0, -500]),
    node('finish', 'finish', [0, 0, -700])],
  edges: [
    edge('approach', 'start', 'split', [[0, 0, 0], [0, 0, -100]]),
    edge('safe', 'split', 'merge', [[0, 0, -100], [80, 0, -200], [0, 0, -300]]),
    edge('air', 'split', 'merge', [[0, 0, -100], [-40, 45, -200], [0, 0, -300]], 'flight'),
    edge('gate', 'merge', 'cp', [[0, 0, -300], [0, 0, -500]]),
    edge('finish-road', 'cp', 'finish', [[0, 0, -500], [0, 0, -700]]),
  ],
  groundRoute: ['approach', 'safe', 'gate', 'finish-road'], checkpoints: ['cp'],
});
const arrive = (edgeId, nextEdgeId, position) => ({
  edgeId, fromS: routeLength(graph, edgeId) - 3,
  toS: routeLength(graph, edgeId) + 1, position,
  ...(nextEdgeId && { nextEdgeId }),
});

test('shared progress API exists and starts at the first safe edge', () => {
  assert.equal(typeof progress.createRouteProgress, 'function');
  assert.equal(typeof progress.advanceRouteProgress, 'function');
  assert.deepEqual(progress.createRouteProgress(graph), {
    currentEdgeId: 'approach', nextCheckpoint: 0, finished: false,
  });
});

test('ground and aerial branch sequences both reach the same ordered checkpoint and finish', () => {
  for (const branch of ['safe', 'air']) {
    let state = progress.createRouteProgress(graph);
    state = progress.advanceRouteProgress(graph, state, arrive('approach', branch, [0, 0, -100]));
    assert.equal(state.currentEdgeId, branch);
    assert.equal(state.nextCheckpoint, 0);
    state = progress.advanceRouteProgress(graph, state, arrive(branch, 'gate', [0, 0, -300]));
    state = progress.advanceRouteProgress(graph, state, arrive('gate', 'finish-road', [0, 0, -500]));
    assert.equal(state.nextCheckpoint, 1);
    assert.equal(state.finished, false);
    state = progress.advanceRouteProgress(graph, state, arrive('finish-road', undefined, [0, 0, -700]));
    assert.equal(state.finished, true);
  }
});

test('a distant or wrong-altitude crossing cannot collect a checkpoint or finish', () => {
  const state = { currentEdgeId: 'gate', nextCheckpoint: 0, finished: false };
  const far = arrive('gate', 'finish-road', [900, 0, -500]);
  assert.deepEqual(progress.advanceRouteProgress(graph, state, far), state);
  const wrongLayer = arrive('gate', 'finish-road', [0, 100, -500]);
  assert.deepEqual(progress.advanceRouteProgress(graph, state, wrongLayer), state);
});

test('wrong edge, reverse crossing and broken junctions never advance', () => {
  const state = progress.createRouteProgress(graph);
  assert.deepEqual(progress.advanceRouteProgress(graph, state, arrive('safe', 'gate', [0, 0, -300])), state);
  const reverse = arrive('approach', 'safe', [0, 0, -100]);
  reverse.fromS = 101; reverse.toS = 90;
  assert.deepEqual(progress.advanceRouteProgress(graph, state, reverse), state);
  assert.deepEqual(progress.advanceRouteProgress(graph, state, arrive('approach', 'finish-road', [0, 0, -100])), state);
});

test('finish cannot be accepted without ordered mandatory checkpoints', () => {
  const forged = { currentEdgeId: 'finish-road', nextCheckpoint: 0, finished: false };
  assert.deepEqual(progress.advanceRouteProgress(graph, forged, arrive('finish-road', undefined, [0, 0, -700])), forged);
});

test('repeated crossing cannot collect the same checkpoint twice', () => {
  const atGate = { currentEdgeId: 'gate', nextCheckpoint: 0, finished: false };
  const event = arrive('gate', 'finish-road', [0, 0, -500]);
  const next = progress.advanceRouteProgress(graph, atGate, event);
  assert.equal(next.nextCheckpoint, 1);
  assert.deepEqual(progress.advanceRouteProgress(graph, next, event), next);
});
