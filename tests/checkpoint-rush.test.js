import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCheckpointRush, stepCheckpointRush } from '../src/checkpoint-rush.js';
const track = { length: 4100, sections: [{ from: 600, to: 1100, type: 'tunnel' }, { from: 2300, to: 2360, type: 'gap' }] };
test('gates stay inside valid route sections with safe separation', () => {
  const a = createCheckpointRush(track), b = createCheckpointRush(track);
  assert.deepEqual(a, b);
  assert.ok(a.gates.length >= 4);
  for (const g of a.gates) {
    assert.ok(Number.isFinite(g.distance) && Number.isFinite(g.x) && Number.isFinite(g.altitude));
    assert.ok(g.distance > 0 && g.distance < track.length);
    assert.ok(!track.sections.some(s => ['gap','launch','tunnel','boost-tunnel','shortcut'].includes(s.type) && g.distance >= s.from - 70 && g.distance <= s.to + 70));
  }
});
test('timed clean gate extends countdown and grants score once', () => {
  const state = createCheckpointRush(track);
  const g = state.gates[0];
  const score = stepCheckpointRush(state, g.distance - 1, { distance: g.distance + 1, x: g.x, altitude: g.altitude }, 0.1);
  assert.equal(score, 400);
  assert.equal(state.perfect, 1);
  assert.equal(state.passed, 1);
  assert.equal(state.missed, 0);
  assert.ok(state.timeLeft > 28);
  assert.equal(stepCheckpointRush(state, g.distance - 1, { distance:g.distance+1, x:g.x, altitude:g.altitude }, 0.1), 0);
  assert.equal(state.passed, 1);
});
test('missed gate cannot count; timer expiry is terminal', () => {
  const state = createCheckpointRush(track);
  const g = state.gates[0];
  stepCheckpointRush(state, g.distance-1, {distance:g.distance+1, x:g.x+8, altitude:g.altitude}, 0.05);
  assert.equal(state.passed,0); assert.equal(state.missed,1);
  stepCheckpointRush(state, g.distance+1, {distance:g.distance+3, x:g.x, altitude:g.altitude}, 0.05);
  assert.equal(state.passed,0);
  state.timeLeft = 0.03;
  stepCheckpointRush(state, 0, {distance:0,x:0,altitude:0}, 0.1);
  assert.equal(state.expired,true);
  assert.equal(state.timeLeft,0);
});
test('invalid distance and bad frame delta are safe', () => {
  assert.throws(() => createCheckpointRush({length:-1,sections:[]}));
  const state=createCheckpointRush(track);
  assert.equal(stepCheckpointRush(state, Infinity,{distance:NaN,x:0,altitude:0},.05),0);
  assert.equal(state.passed,0);
  assert.equal(stepCheckpointRush(state,0,{distance:1,x:0,altitude:0},NaN),0);
});
