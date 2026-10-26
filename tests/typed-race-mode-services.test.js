import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createElimination, stepElimination } from '../src/elimination.js';
import { createCheckpointRush, stepCheckpointRush, checkpointDirection } from '../src/checkpoint-rush.js';
import { createStuntAttack, scoreStuntAttack, stuntMedal } from '../src/stunt-attack.js';

// Preserve observable game rules while eliminating duplicate JS copies.
test('race-mode services migrate to one canonical strict TypeScript implementation', () => {
  for (const name of ['elimination', 'checkpoint-rush', 'stunt-attack']) {
    assert.equal(existsSync(new URL(`../src/${name}.ts`, import.meta.url)), true, `${name} must be strict TypeScript`);
    assert.equal(existsSync(new URL(`../src/${name}.js`, import.meta.url)), false, `${name} must not keep duplicate JS`);
  }
});
test('elimination preserves deterministic knockout and terminal outcome without extra rewards', () => {
  const race = { elapsed: 10, player: { distance: 100 }, rivals: [
    { name: 'NOVA', distance: 20 }, { name: 'ORBIT', distance: 20 }, { name: 'APEX', distance: 20 },
  ] };
  const state = createElimination();
  assert.deepEqual(stepElimination(state, race), { eliminated: 'APEX', outcome: null });
  assert.equal(stepElimination(state, race), null);
  race.elapsed = 20;
  assert.deepEqual(stepElimination(state, race), { eliminated: 'ORBIT', outcome: null });
});
test('checkpoint mode keeps deterministic directional guidance and one-time gate credit', () => {
  const state = createCheckpointRush({ length: 2000, sections: [] });
  const gate = state.gates[0];
  assert.equal(checkpointDirection({ x: gate.x - 3, altitude: gate.altitude }, gate), 'right');
  const car = { distance: gate.distance + 1, x: gate.x, altitude: gate.altitude };
  assert.equal(stepCheckpointRush(state, gate.distance - 1, car, .05), 400);
  assert.equal(stepCheckpointRush(state, gate.distance - 1, car, .05), 0);
});
test('stunt combo remains once-per-event and medal scaling follows selected duration', () => {
  const s = createStuntAttack();
  const car = { speed: 50, altitude: 2, collisions: 0, falls: 0, nearMisses: 1, rings: 0 };
  assert.equal(scoreStuntAttack(s, car, 100, .1, 1), 20);
  assert.equal(s.combo, 1);
  assert.equal(stuntMedal(8000, 120), 'gold');
  assert.equal(stuntMedal(8000, 300), 'bronze');
  assert.equal(stuntMedal(Number.NaN), null);
});
