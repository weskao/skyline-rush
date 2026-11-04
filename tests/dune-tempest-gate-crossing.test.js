import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDuneGates, crossesDuneGate } from '../src/courses/dune-tempest-gates.ts';

const course = {
  nodes: { start: { position: [0, 8, 0] }, cp1: { position: [100, 10, -100] }, finish: { position: [200, 8, -200] } },
  checkpoints: ['cp1'],
  edges: [
    { id: 'approach', from: 'start', to: 'cp1', role: 'main', widthMeters: 32,
      controlPoints: [[0, 8, 0], [80, 10, -80], [100, 10, -100]] },
    { id: 'finish-road', from: 'cp1', to: 'finish', role: 'main', widthMeters: 42,
      controlPoints: [[100, 10, -100], [180, 8, -180], [200, 8, -200]] },
  ],
};
const gate = buildDuneGates(course)[0];
const pose = (along, sideways = 0, altitude = 0) => [
  gate.center[0] + gate.forwardXZ[0] * along - gate.forwardXZ[1] * sideways,
  gate.center[1] + altitude,
  gate.center[2] + gate.forwardXZ[1] * along + gate.forwardXZ[0] * sideways,
];

test('gate registers one forward crossing from its authored incoming road', () => {
  assert.equal(crossesDuneGate(gate, pose(-9), pose(9), 'approach'), true);
  assert.equal(crossesDuneGate(gate, pose(-9, gate.halfWidthMeters), pose(9, gate.halfWidthMeters), 'approach'), true);
});

test('reverse, tangential and unrelated edge approaches cannot cross the gate', () => {
  assert.equal(crossesDuneGate(gate, pose(9), pose(-9), 'approach'), false);
  assert.equal(crossesDuneGate(gate, pose(-1, -17), pose(1, 17), 'approach'), false);
  assert.equal(crossesDuneGate(gate, pose(-9), pose(9), 'finish-road'), false);
  assert.equal(crossesDuneGate(gate, pose(0), pose(9), 'approach'), false);
});

test('crossing point, not endpoints, determines altitude and lateral boundaries', () => {
  assert.equal(crossesDuneGate(gate, pose(-9, 0, 95), pose(9, 0, 95), 'approach'), false);
  assert.equal(crossesDuneGate(gate, pose(-9, 0, 0), pose(9, 0, 50), 'approach'), false);
  assert.equal(crossesDuneGate(gate, pose(-9, 0, 0), pose(9, 0, 40), 'approach'), true);
  assert.equal(crossesDuneGate(gate, pose(-9, gate.halfWidthMeters + 1), pose(9, gate.halfWidthMeters + 1), 'approach'), false);
  assert.equal(crossesDuneGate(gate, pose(-20, -gate.halfWidthMeters - 1), pose(20, gate.halfWidthMeters + 1), 'approach'), true);
});

test('rejects teleport-length and non-finite updates instead of granting skipped checkpoints', () => {
  assert.equal(crossesDuneGate(gate, pose(-60), pose(60), 'approach'), false);
  assert.equal(crossesDuneGate(gate, [NaN, 10, 0], pose(9), 'approach'), false);
  assert.equal(crossesDuneGate(gate, pose(-9), [Infinity, 10, 0], 'approach'), false);
});
