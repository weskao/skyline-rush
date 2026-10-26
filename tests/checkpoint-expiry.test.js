import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepCheckpointRush } from '../src/checkpoint-rush.ts';

const challenge = seconds => ({
  gates: [{ distance: 100, x: 2.5, altitude: 0, passed: false, missed: false }],
  timeLeft: seconds, passed: 0, missed: 0, perfect: 0, expired: false,
});
const player = distance => ({ distance, x: 2.5, altitude: 0 });

test('checkpoint crossed after timer expiry does not resurrect the run', () => {
  const state = challenge(0.02);
  assert.equal(stepCheckpointRush(state, 99, player(101), 0.1), 0);
  assert.equal(state.expired, true);
  assert.equal(state.timeLeft, 0);
  assert.equal(state.passed, 0);
  assert.equal(state.gates[0].passed, false);
});

test('checkpoint crossed before timer expiry earns time even in a long frame', () => {
  const state = challenge(0.03);
  assert.equal(stepCheckpointRush(state, 99, player(109), 0.1), 400);
  assert.equal(state.expired, false);
  assert.equal(state.passed, 1);
  assert.equal(state.perfect, 1);
  assert.ok(Math.abs(state.timeLeft - 9.93) < 1e-8);
});

test('no checkpoint causes timer to expire normally', () => {
  const state = challenge(0.02);
  assert.equal(stepCheckpointRush(state, 0, player(1), 0.1), 0);
  assert.equal(state.expired, true);
  assert.equal(state.timeLeft, 0);
});
