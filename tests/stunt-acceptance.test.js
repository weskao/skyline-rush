import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';
import { createControls } from '../src/input.ts';
import { drainSteps, SIM_STEP } from '../src/frame-pacing.ts';
import { createStuntRun, addStuntHeat, stuntHeatContinues, stuntHeatLimit } from '../src/stunt-attack.ts';
import { recordModeRace, loadModeBest } from '../src/history-mode.ts';

// 9E acceptance: a whole Stunt Attack session, heat restarts included, driven the way main.js drives it.
const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) }; };
const send = (target, type, properties = {}) => { const event = new Event(type, { cancelable: true }); Object.assign(event, properties); target.dispatchEvent(event); };

// Per-step player intent: throttle, weaving, hops and a nitro burst, so drift, air time and combos all score.
const intent = step => ({
  throttle: true, brake: false, nitro: step % 1800 > 1700,
  steer: Math.sin(step / 90) > 0.6 ? 1 : Math.sin(step / 90) < -0.6 ? -1 : 0,
  fly: step % 600 > 420, boost: step % 600 > 540,
});
// Keyboard and touch buttons that produce a given intent through the real input layer.
function devices() {
  const keys = new EventTarget(), keyboard = createControls(keys);
  const touch = createControls(new EventTarget());
  const buttons = Object.fromEntries(['throttle', 'left', 'right', 'fly', 'boost', 'nitro', 'brake'].map(action => {
    const button = new EventTarget(); touch.bindButton(button, action); return [action, button];
  }));
  const codes = { throttle: 'KeyW', left: 'ArrowLeft', right: 'ArrowRight', fly: 'Space', boost: 'ShiftLeft', nitro: 'KeyE', brake: 'KeyS' };
  const held = { keyboard: new Set(), touch: new Set() };
  const press = (device, wanted) => {
    for (const action of Object.keys(codes)) {
      const on = wanted.has(action), was = held[device].has(action);
      if (on === was) continue;
      if (device === 'keyboard') send(keys, on ? 'keydown' : 'keyup', { code: codes[action] });
      else send(buttons[action], on ? 'pointerdown' : 'pointerup', { pointerId: Object.keys(codes).indexOf(action) + 1, pointerType: 'touch' });
      if (on) held[device].add(action); else held[device].delete(action);
    }
  };
  const wanted = i => new Set(Object.entries({ throttle: i.throttle, brake: i.brake, fly: i.fly, boost: i.boost, nitro: i.nitro,
    left: i.steer < 0, right: i.steer > 0 }).filter(([, on]) => on).map(([action]) => action));
  return {
    keyboard: i => { press('keyboard', wanted(i)); return keyboard.read(); },
    touch: i => { press('touch', wanted(i)); return touch.read(); },
  };
}

// Runs a full session: frame loop with variable display deltas, fixed simulation steps, heats restarted as main.js does.
function playSession({ frameDelta, readInput, duration = 120, trackId = 'coast' }) {
  const run = createStuntRun(trackId, duration);
  let race = createRace(trackId, { mode: 'stunt', duration });
  startRace(race);
  let accumulator = 0, step = 0, frame = 0, lastHeat = null, guard = 0;
  while (guard++ < 200000) {
    const due = drainSteps(accumulator, frameDelta(frame++));
    accumulator = due.accumulator;
    for (let s = 0; s < due.steps; s++) {
      stepRace(race, readInput(intent(step++)), SIM_STEP);
      if (race.phase !== 'finished') continue;
      addStuntHeat(run, race);
      lastHeat = race;
      if (!stuntHeatContinues(run, race.result.endReason)) return { run, lastHeat, step };
      race = createRace(trackId, race.config);
      race.stuntLimit = stuntHeatLimit(run);
      startRace(race);
    }
  }
  throw new Error('session never ended');
}
const summary = ({ run, lastHeat }) => ({ score: run.score, heats: run.heats, maxCombo: run.maxCombo,
  airTime: run.airTime, elapsed: run.elapsed, endReason: lastHeat.result.endReason });

test('Stunt session totals are identical at 30, 60, 120, 144 Hz and a jittery display', () => {
  const rates = [30, 60, 120, 144].map(hz => () => 1 / hz);
  let jitter = 7;
  rates.push(() => { jitter = (jitter * 48271) % 2147483647; return 0.004 + (jitter % 1000) / 1000 * 0.046; });
  const results = rates.map(frameDelta => summary(playSession({ frameDelta, readInput: input => input })));
  for (const result of results.slice(1)) assert.deepEqual(result, results[0]);
  assert.ok(results[0].score > 0 && results[0].maxCombo > 0 && results[0].airTime > 0, JSON.stringify(results[0]));
});

test('keyboard and touch buttons give the same input every step and the same Stunt result', () => {
  const sim = devices();
  const keyboard = playSession({ frameDelta: () => 1 / 60, readInput: input => sim.keyboard(input) });
  const touch = playSession({ frameDelta: () => 1 / 60, readInput: input => sim.touch(input) });
  assert.deepEqual(summary(touch), summary(keyboard));
  for (let i = 0; i < 3600; i += 7) assert.deepEqual(sim.touch(intent(i)), sim.keyboard(intent(i)), `step ${i}`);
});

test('the session ends on its timer without reaching the sprint finish, and the result is saved', () => {
  const played = playSession({ frameDelta: () => 1 / 60, readInput: input => input });
  const { run, lastHeat } = played;
  assert.ok(run.heats >= 2, `heats ${run.heats}`);
  assert.equal(lastHeat.result.endReason, 'timer');
  assert.ok(lastHeat.player.distance < lastHeat.length, 'final heat stops short of the route end');
  assert.ok(Math.abs(run.elapsed - run.duration) < 1e-9, `elapsed ${run.elapsed}`);
  assert.equal(lastHeat.result.success, true);
  const storage = memory();
  const { best } = recordModeRace({ ...lastHeat, result: { ...lastHeat.result, time: run.elapsed,
    score: Math.round(run.score), maxCombo: run.maxCombo, airTime: run.airTime } }, storage);
  assert.equal(best, Math.round(run.score));
  assert.equal(loadModeBest('coast', lastHeat.config, storage), Math.round(run.score));
});

test('a heat that reaches the route end continues the session with the remaining time', () => {
  const run = createStuntRun('coast', 180);
  const race = createRace('coast', { mode: 'stunt', duration: 180 });
  startRace(race);
  for (let i = 0; i < 181; i++) stepRace(race, {}, SIM_STEP);
  race.player.distance = race.length - 0.1; race.player.speed = 80;
  stepRace(race, {}, SIM_STEP);
  addStuntHeat(run, race);
  assert.equal(race.result.endReason, 'route');
  assert.equal(stuntHeatContinues(run, race.result.endReason), true);
  assert.ok(Math.abs(stuntHeatLimit(run) - (180 - race.result.time)) < 1e-9);
  assert.equal(stuntHeatContinues({ ...run, elapsed: 180 }, 'route'), false);
  assert.equal(stuntHeatContinues(run, 'timer'), false);
});

test('fixed simulation steps: every display rate runs the same number of 1/60 s steps', () => {
  for (const hz of [30, 60, 120, 144, 240]) {
    let accumulator = 0, steps = 0;
    for (let f = 0; f < hz * 10; f++) {
      const due = drainSteps(accumulator, 1 / hz);
      steps += due.steps; accumulator = due.accumulator;
    }
    assert.ok(Math.abs(steps - 600) <= 1, `${hz} Hz: ${steps}`);
  }
  assert.deepEqual(drainSteps(0, 0.2), drainSteps(0, 0.05), 'a long hitch is clamped like main.js');
});
