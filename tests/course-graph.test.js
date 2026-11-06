import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';

const node = (id, kind, at) => ({ id, kind, at });
const edge = (id, from, to, points, mode = 'ground') => ({ id, from, to, points, width: 28, mode });
const course = () => ({
  id: 'test-route', version: 1, start: 'start', finish: 'finish',
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
const mutate = fn => { const g = course(); fn(g); return g; };

test('valid branching point-to-point graph includes a safe ground route', () => {
  const g = course();
  assert.equal(validateCourseGraph(g), g);
});

test('validator rejects duplicate or missing nodes and unsafe graph topology', () => {
  assert.throws(() => validateCourseGraph(mutate(g => { g.nodes.push({ ...g.nodes[0] }); })), /duplicate/i);
  assert.throws(() => validateCourseGraph(mutate(g => { g.start = 'no-node'; })), /start|node/i);
  assert.throws(() => validateCourseGraph(mutate(g => { g.finish = 'start'; })), /finish|distinct/i);
  assert.throws(() => validateCourseGraph(mutate(g => { g.nodes.at(-1).at = [0, 0, 0]; })), /finish|distinct|position/i);
  assert.throws(() => validateCourseGraph(mutate(g => { g.edges.push(edge('cycle', 'cp', 'split', [[0, 0, -500], [0, 0, -100]])); })), /cycle/i);
  assert.throws(() => validateCourseGraph(mutate(g => { g.nodes.push(node('dead', 'merge', [999, 0, -250])); g.edges.push(edge('dead-end', 'split', 'dead', [[0, 0, -100], [999, 0, -250]])); })), /dead|finish|reach/i);
});

test('validator rejects checkpoint bypass on flight or ground shortcuts', () => {
  assert.throws(() => validateCourseGraph(mutate(g => {
    g.edges.push(edge('skip-gate', 'merge', 'finish', [[0, 0, -300], [0, 0, -700]], 'flight'));
  })), /checkpoint|bypass/i);
  assert.throws(() => validateCourseGraph(mutate(g => { g.checkpoints = ['no-node']; })), /checkpoint|node/i);
});

test('validator rejects malformed geometry and missing usable ground path', () => {
  assert.throws(() => validateCourseGraph(mutate(g => { g.edges[0].points[0] = [NaN, 0, 0]; })), /finite|point/i);
  assert.throws(() => validateCourseGraph(mutate(g => { g.edges[1].width = 0; })), /width/i);
  assert.throws(() => validateCourseGraph(mutate(g => { g.edges[2].points[0] = [55, 0, 100]; })), /endpoint|point/i);
  assert.throws(() => validateCourseGraph(mutate(g => { g.groundRoute[1] = 'air'; })), /ground/i);
});

test('arc-length route sampling shares a finite orthonormal frame with the road', () => {
  const g = course(); validateCourseGraph(g);
  assert.equal(routeLength(g, 'approach'), 100);
  const a = sampleRoute(g, 'approach', 50);
  assert.deepEqual(a.point, [0, 0, -50]);
  assert.equal(a.edgeId, 'approach');
  assert.equal(a.localS, 50);
  assert.equal(a.width, 28);
  for (const vec of [a.forward, a.right, a.up]) assert.ok(Math.abs(Math.hypot(...vec) - 1) < 1e-6);
  for (const [u, v] of [[a.forward, a.right], [a.forward, a.up], [a.right, a.up]])
    assert.ok(Math.abs(u.reduce((s, n, i) => s + n * v[i], 0)) < 1e-6);
});

test('sampling curved/vertical route remains finite and clamps outside the edge', () => {
  const g = course(); validateCourseGraph(g);
  for (const id of ['safe', 'air']) {
    const length = routeLength(g, id);
    assert.ok(length > 200, id);
    for (const s of [0, length * .1, length * .5, length * .9, length]) {
      const f = sampleRoute(g, id, s);
      assert.ok([...f.point, ...f.forward, ...f.right, ...f.up, f.curvature].every(Number.isFinite), `${id} at ${s}`);
    }
    assert.deepEqual(sampleRoute(g, id, -5).point, g.edges.find(e => e.id === id).points[0]);
    assert.deepEqual(sampleRoute(g, id, length + 10).point, g.edges.find(e => e.id === id).points.at(-1));
  }
});

test('near-vertical ramps retain finite, orthogonal road frames', () => {
  const g = mutate(g => {
    g.nodes[1].at = [0, 100, 0];
    g.edges[0].points = [[0, 0, 0], [0, 100, 0]];
    g.edges[1].points[0] = [0, 100, 0];
    g.edges[2].points[0] = [0, 100, 0];
  });
  validateCourseGraph(g);
  const f = sampleRoute(g, 'approach', 50);
  assert.ok([...f.point, ...f.right, ...f.up].every(Number.isFinite));
  assert.ok(Math.abs(f.forward.reduce((s, n, i) => s + n * f.up[i], 0)) < 1e-6);
});
