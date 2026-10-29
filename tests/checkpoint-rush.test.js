import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCheckpointRush, stepCheckpointRush } from '../src/checkpoint-rush.ts';
import { RACE_TRACKS } from '../src/game.js';
import { roadObstacles } from '../src/world-tour-scene.js';
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


test('RED MODE-05: checkpoints move into a clear, grounded lane when scenery blocks their gate', () => {
  const obstacles = [{ from: 323, to: 337, left: -8, right: 0, bottom: 0, top: 6 }];
  const gates = createCheckpointRush(track, obstacles).gates;
  const first = gates.find(gate => gate.distance === 330);
  assert.ok(first, 'a single blocked lane must not remove a reachable checkpoint');
  assert.ok(first.x >= 2.5, 'the original -2.5 m lane overlaps the building');
  assert.ok(gates.every(gate => obstacles.every(obstacle =>
    gate.distance < obstacle.from - 4 || gate.distance > obstacle.to + 4 ||
    gate.x + 3.2 < obstacle.left || gate.x - 3.2 > obstacle.right ||
    gate.altitude > obstacle.top + 1 || gate.altitude + 4.8 < obstacle.bottom
  )));
});

test('RED MODE-05: a completely blocked checkpoint is skipped rather than made impossible', () => {
  const obstacles = [{ from: 320, to: 340, left: -12, right: 12, bottom: -1, top: 12 }];
  const gates = createCheckpointRush(track, obstacles).gates;
  assert.ok(!gates.some(gate => gate.distance === 330));
  assert.ok(gates.some(gate => gate.distance > 330));
  assert.deepEqual(gates, createCheckpointRush(track, obstacles).gates, 'repeated runs remain identical');
});

test('RED MODE-05: checkpoint obstacles must have finite ordered geometry', () => {
  assert.throws(() => createCheckpointRush(track, [
    { from: NaN, to: 400, left: -5, right: 5, bottom: 0, top: 2 },
  ]), /obstacle|track|bounds|finite/i);
  assert.throws(() => createCheckpointRush(track, [
    { from: 350, to: 330, left: -5, right: 5, bottom: 0, top: 2 },
  ]), /obstacle|track|bounds|finite/i);
});

test('MODE-05: real ten-track scenery leaves deterministic, reachable and clear gates', () => {
  for (const [id, route] of Object.entries(RACE_TRACKS)) {
    const obstacles = roadObstacles(id);
    const state = createCheckpointRush(route, obstacles);
    assert.deepEqual(state.gates, createCheckpointRush(route, obstacles).gates, id);
    assert.ok(state.gates.length > 0, id + ': no reachable checkpoints');
    for (const gate of state.gates) {
      assert.ok(Number.isFinite(gate.x) && Number.isFinite(gate.distance), id);
      assert.ok([-7.5, -2.5, 2.5, 7.5].includes(gate.x), id);
      assert.ok([0, 3].includes(gate.altitude), id);
      assert.ok(!route.sections.some(section =>
        ['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut'].includes(section.type) &&
        gate.distance >= section.from - 70 && gate.distance <= section.to + 70
      ), id + ': unsafe tunnel, shortcut or gap');
      assert.ok(obstacles.every(o =>
        gate.distance < o.from - 4 || gate.distance > o.to + 4 ||
        gate.x + 3.2 < o.left || gate.x - 3.2 > o.right ||
        gate.altitude > o.top + 1 || gate.altitude + 4.8 < o.bottom
      ), id + ': gate intersects authored scenery');
    }
  }
});
