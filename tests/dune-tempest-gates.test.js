import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDuneGates } from '../src/courses/dune-tempest-gates.ts';

const sample = {
  nodes: {
    start: { position: [0, 8, 0] },
    cp1: { position: [100, 10, -100] },
    cp2: { position: [250, 12, -220] },
    finish: { position: [400, 8, -300] },
  },
  checkpoints: ['cp1', 'cp2'],
  edges: [
    { id: 'approach-1', from: 'start', to: 'cp1', role: 'main', widthMeters: 32,
      controlPoints: [[0, 8, 0], [80, 8, -75], [100, 10, -100]] },
    { id: 'approach-2', from: 'cp1', to: 'cp2', role: 'main', widthMeters: 44,
      controlPoints: [[100, 10, -100], [235, 12, -205], [250, 12, -220]] },
    { id: 'approach-finish', from: 'cp2', to: 'finish', role: 'main', widthMeters: 48,
      controlPoints: [[250, 12, -220], [385, 8, -287], [400, 8, -300]] },
  ],
};

test('authored gates follow checkpoints then finish with their actual incoming main edges', () => {
  const gates = buildDuneGates(sample);
  assert.deepEqual(gates.map(g => g.id), ['cp1', 'cp2', 'finish']);
  assert.deepEqual(gates.map(g => g.order), [1, 2, 3]);
  assert.deepEqual(gates.map(g => g.approachEdgeId), ['approach-1', 'approach-2', 'approach-finish']);
  assert.deepEqual(gates.map(g => g.center), [[100, 10, -100], [250, 12, -220], [400, 8, -300]]);
});

test('gate directions match the last on-road segment and reject high-altitude bypass', () => {
  const gates = buildDuneGates(sample);
  for (const g of gates) {
    assert.ok(Math.abs(Math.hypot(...g.forwardXZ) - 1) < 1e-10);
    const incoming = sample.edges.find(e => e.id === g.approachEdgeId);
    const points = incoming.controlPoints;
    const before = points.at(-2);
    assert.ok((g.center[0] - before[0]) * g.forwardXZ[0]
      + (g.center[2] - before[2]) * g.forwardXZ[1] > 0);
    assert.ok(g.halfWidthMeters >= incoming.widthMeters / 2);
    assert.ok(g.halfWidthMeters <= incoming.widthMeters / 2 + 5);
    assert.ok(g.minRelativeAltitudeMeters < 0);
    assert.ok(g.maxRelativeAltitudeMeters >= 12 && g.maxRelativeAltitudeMeters < 90,
      '95m aerial flyover must not count as a checkpoint');
  }
});

test('malformed or ambiguous route cannot create a checkpoint gate', () => {
  const corrupt = { ...sample, edges: sample.edges.filter(e => e.to !== 'cp1') };
  assert.throws(() => buildDuneGates(corrupt), /cp1/);
  const duplicate = { ...sample, edges: [...sample.edges, { ...sample.edges[0], id: 'duplicate' }] };
  assert.throws(() => buildDuneGates(duplicate), /cp1/);
  const degenerate = { ...sample, edges: sample.edges.map(e => e.to === 'cp1' ?
    { ...e, controlPoints: [...e.controlPoints.slice(0, -2), sample.nodes.cp1.position, sample.nodes.cp1.position] } : e) };
  assert.throws(() => buildDuneGates(degenerate), /cp1/);
});
