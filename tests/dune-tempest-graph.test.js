import test from 'node:test';
import assert from 'node:assert/strict';
import { createDuneCourseGraph } from '../src/courses/dune-tempest-graph.ts';
import { DUNE_TEMPEST_COURSE, DUNE_TEMPEST_GRAPH } from '../src/courses/dune-tempest.ts';

const fixture = () => ({
  id: 'dune-tempest', topologyVersion: 3,
  nodes: {
    start: { kind: 'start', position: [0, 1, 0] },
    split: { kind: 'split', position: [0, 2, -100] },
    merge: { kind: 'merge', position: [0, 3, -200] },
    cp1: { kind: 'checkpoint', position: [0, 3, -300] },
    finish: { kind: 'finish', position: [0, 4, -400] },
  },
  checkpoints: ['cp1'],
  edges: [
    { id: 'final', from: 'cp1', to: 'finish', role: 'main', surface: 'sand-road', widthMeters: 40, controlPoints: [[0, 3, -300], [0, 4, -400]] },
    { id: 'air', from: 'split', to: 'merge', role: 'shortcut', surface: 'air-route', widthMeters: 24, controlPoints: [[0, 2, -100], [20, 95, -150], [0, 3, -200]] },
    { id: 'start', from: 'start', to: 'split', role: 'main', surface: 'sand-road', widthMeters: 30, controlPoints: [[0, 1, 0], [0, 2, -100]] },
    { id: 'safe', from: 'split', to: 'merge', role: 'main', surface: 'canyon-track', widthMeters: 28, controlPoints: [[0, 2, -100], [50, 5, -150], [0, 3, -200]] },
    { id: 'gate', from: 'merge', to: 'cp1', role: 'main', surface: 'sand-road', widthMeters: 32, controlPoints: [[0, 3, -200], [0, 3, -300]] },
  ],
});
test('maps authored edges and nodes to the shared CourseGraph shape without mutating source', () => {
  const source = fixture(), graph = createDuneCourseGraph(source);
  assert.deepEqual(Object.keys(graph), ['id','version','start','finish','nodes','edges','checkpoints','groundRoute']);
  assert.equal(graph.version, 3);
  assert.deepEqual(graph.groundRoute, ['start','safe','gate','final']);
  assert.deepEqual(graph.checkpoints, ['cp1']);
  assert.deepEqual(graph.nodes.find(n => n.id === 'cp1'), { id: 'cp1', kind: 'checkpoint', at: [0,3,-300] });
  assert.deepEqual(graph.edges.find(e => e.id === 'air'), {
    id: 'air',from:'split',to:'merge',points:[[0,2,-100],[20,95,-150],[0,3,-200]],
    width:24,mode:'flight',surface:'air-route',
  });
  assert.equal(source.edges[0].id, 'final');
});
test('fails closed on missing, ambiguous or cyclical primary ground routes', () => {
  const missing = fixture(); missing.edges = missing.edges.filter(e => e.id !== 'safe');
  assert.throws(() => createDuneCourseGraph(missing), /ground|main/);
  const loop = fixture(); loop.edges.push({ ...loop.edges.find(e => e.id === 'start'), id:'repeat',from:'split',to:'split' });
  assert.throws(() => createDuneCourseGraph(loop), /main|cycle|ground/);
});
test('rejects flight surface as mandatory ground and non-finite points', () => {
  const flight = fixture(); flight.edges.find(e => e.id === 'safe').surface = 'air-route';
  assert.throws(() => createDuneCourseGraph(flight), /ground/);
  const invalid = fixture(); invalid.edges[0].controlPoints[1][0] = NaN;
  assert.throws(() => createDuneCourseGraph(invalid), /finite|geometry/);
});
test('real 13.5 km Dune graph exposes every branch for the shared route sampler', () => {
  const graph = DUNE_TEMPEST_GRAPH;
  assert.equal(graph.id, 'dune-tempest');
  assert.equal(graph.nodes.length, 12);
  assert.equal(graph.edges.length, 14);
  assert.equal(graph.groundRoute.length, 11);
  assert.deepEqual(graph.checkpoints, ['cp1','cp2','cp3','cp4']);
  assert.equal(graph.edges.filter(e=>e.mode === 'flight').length, 1);
  assert.equal(graph.groundRoute.includes('canyon-air-crossing'), false);
  for (const edge of graph.edges) {
    const original = DUNE_TEMPEST_COURSE.edges.find(x=>x.id === edge.id);
    assert.deepEqual(edge.points, original.controlPoints);
    assert.equal(edge.width, original.widthMeters);
  }
});
