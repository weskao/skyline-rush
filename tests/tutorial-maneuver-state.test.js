import test from 'node:test';
import assert from 'node:assert/strict';
import { createTutorialManeuverState } from '../src/tutorial-maneuver-state.ts';

const fresh = () => ({ altitude: 0, thrusting: false, flightBoosted: false, poweredFlightTime: 0, flick: null, landing: null,
  trick: null, trickPayout: null, nitroUses: 0, nitroTime: 0, speed: 45 });

test('AIR→ROAD CHAIN completes only from a new engine-confirmed powered flight landing and pays once', () => {
  const car = fresh(), state = createTutorialManeuverState('airChain', car);
  assert.equal(state.update({ ...car, landing: { chain: true } }, 1 / 60), false, 'stale success cannot count');
  assert.equal(state.update({ ...car, altitude: 2, thrusting: true, flightBoosted: true, poweredFlightTime: .2 }, 1 / 60), false);
  assert.equal(state.phase, 'ready', 'do not cue release before the engine can award a chain');
  assert.equal(state.update({ ...car, landing: { chain: false } }, 1 / 60), false, 'hard landing cannot count');
  assert.equal(state.update({ ...car, altitude: 2, thrusting: true, flightBoosted: true, poweredFlightTime: .5 }, 1 / 60), false);
  assert.equal(state.phase, 'airborne', 'engine-ready flight cues a safe release');
  const success = { chain: true };
  assert.equal(state.update({ ...car, landing: success }, 1 / 60), true);
  assert.equal(state.update({ ...car, landing: success }, 1 / 60), false, 'one reward event once');
});

test('BARREL ROLL requires a new real roll and a new clean engine payout', () => {
  const car = fresh(), state = createTutorialManeuverState('barrelRoll', car);
  const invalid = { nitro: 0, hard: true };
  assert.equal(state.update({ ...car, trickPayout: { nitro: .25, hard: false } }, 1 / 60), false);
  const firstFlick = { dir: -1, time: 1 };
  state.update({ ...car, altitude: 3, flick: firstFlick }, 1 / 60);
  assert.equal(state.phase, 'flicked', 'first real flick should be visible to the learner');
  state.update({ ...car, altitude: 3, trick: { done: false } }, 1 / 60);
  assert.equal(state.phase, 'rolling');
  state.update({ ...car, altitude: 3, trick: { done: true } }, 1 / 60);
  assert.equal(state.phase, 'readyToLand', 'only a finished engine roll cues a landing');
  assert.equal(state.update({ ...car, landing: { chain: false }, trickPayout: invalid }, 1 / 60), false);
  assert.equal(state.phase, 'ready', 'a failed landing resets the coach');
  state.update({ ...car, altitude: 3, trick: { done: true } }, 1 / 60);
  assert.equal(state.update({ ...car, landing: { chain: false }, trickPayout: { nitro: .25, hard: false } }, 1 / 60), true);
});

test('NITRO needs genuine activation, observable acceleration and sustained sprint', () => {
  const car = fresh(), state = createTutorialManeuverState('nitro', car);
  for (let i = 0; i < 150; i++) assert.equal(state.update({ ...car, nitroTime: 2, speed: 95 }, 1 / 60), false);
  assert.equal(state.phase, 'ready');
  for (let i = 0; i < 80; i++) assert.equal(state.update({ ...car, nitroUses: 1, nitroTime: 2 - i / 60, speed: 45 + i * .5 }, 1 / 60), false);
  assert.equal(state.phase, 'sprinting');
  assert.ok(state.progress > .5 && state.progress < 1);
  for (let i = 80; i < 105; i++) {
    const result = state.update({ ...car, nitroUses: 1, nitroTime: 2 - i / 60, speed: 45 + i * .5 }, 1 / 60);
    if (i < 95) assert.equal(result, false);
    if (result) return;
  }
  assert.fail('sustained genuine sprint did not complete');
});

test('NITRO ignores replayed events, invalid frames and interrupted sprint', () => {
  const car = fresh(), state = createTutorialManeuverState('nitro', car);
  state.update({ ...car, nitroUses: 1, nitroTime: 2.48, speed: 46 }, 1 / 60);
  for (let i = 0; i < 200; i++) assert.equal(state.update({ ...car, nitroUses: 1, nitroTime: 0, speed: 80 }, 1 / 60), false);
  assert.equal(state.progress, 0);
  assert.equal(state.phase, 'retry', 'spent but incomplete NITRO must explicitly request another attempt');
  assert.equal(state.update({ ...car, nitroUses: 1, nitroTime: 2.2, speed: 85 }, NaN), false);
  assert.equal(state.update({ ...car, nitroUses: 1, nitroTime: 2.2, speed: 85 }, 0), false);
});

test('BARREL ROLL must not reuse a landing from before the latest roll', () => {
  const oldLanding = { chain: false };
  const car = { ...fresh(), landing: oldLanding };
  const state = createTutorialManeuverState('barrelRoll', car);
  state.update({ ...car, altitude: 2, trick: { done: true } }, 1 / 60);
  assert.equal(state.update({ ...car, trickPayout: { nitro: .25, hard: false } }, 1 / 60), false);
});
