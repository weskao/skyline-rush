import test from 'node:test';
import assert from 'node:assert/strict';
import { stepRace } from '../src/game.js';
import { createInteractiveTutorial, prepareTutorialInput, TUTORIAL_STEPS } from '../src/interactive-tutorial.ts';

// With AUTO off nothing holds the accelerator, so every lesson is played with the fingers a player really has.
// A phone has two thumbs: BOOST + FLY share one (input.ts bridges their seam) and the slide pad steers and brakes with one.
const DT = 1 / 60;
const THUMBS = {
  keyboard: () => 0,
  buttons: i => [i.steer, i.brake, i.throttle, i.nitro, i.fly || i.boost].filter(Boolean).length,
  slide: i => [i.steer || i.brake, i.throttle, i.nitro, i.fly || i.boost].filter(Boolean).length,
};
const MODES = Object.keys(THUMBS);

function drive(session, mode, action) {
  assert.ok(THUMBS[mode](action) <= 2, `${mode} needs more than two thumbs: ${JSON.stringify(action)}`);
  const input = prepareTutorialInput({ ...action }, false);
  assert.equal(input.throttle === true, action.throttle === true, 'AUTO off never holds the accelerator for the player');
  assert.equal(input.steer ?? 0, action.steer ?? 0, 'the tutorial never steers');
  stepRace(session.race, input, DT);
  session.update(input, DT);
}
function until(session, mode, policy, frames = 3600) {
  const start = session.index;
  for (let frame = 0; frame < frames && session.index === start; frame++) drive(session, mode, policy(frame));
  assert.equal(session.index, start + 1, `${mode}: ${TUTORIAL_STEPS[start]} was not completed`);
}
function gasTo(session, mode, speed) {
  const car = session.race.player;
  for (let i = 0; i < 900 && car.speed < speed; i++) drive(session, mode, { throttle: true });
  assert.ok(car.speed >= speed, `${mode}: the accelerator alone reaches ${speed} m/s`);
}
function toward(session, x) {
  const dx = x - session.race.player.x;
  return { throttle: true, steer: Math.abs(dx) > .4 ? Math.sign(dx) : 0 };
}
function drift(session, mode) {
  const car = session.race.player;
  gasTo(session, mode, 65);
  for (let i = 0; i < 300 && Math.abs(car.x) > 1; i++) drive(session, mode, toward(session, 0));
  // Sustained one-way steering would hit the rail, which cancels a real drift.
  for (let i = 0; i < 130; i++) drive(session, mode, { brake: true, steer: Math.floor(i / 10) % 2 ? 1 : -1 });
  until(session, mode, () => ({ throttle: true }));
}
function boost(session, mode) {
  // A phone thumb leaves the accelerator for BOOST; the keyboard can hold both.
  const inStretch = mode === 'keyboard' ? { throttle: true, boost: true } : { boost: true };
  until(session, mode, () => session.cue?.key === 'tutorial.cue.boostGo' ? inStretch : { throttle: true });
}
function airChain(session, mode) {
  gasTo(session, mode, 45);
  for (let i = 0; i < 42; i++) drive(session, mode, { fly: true, boost: true });
  until(session, mode, () => ({ throttle: true }), 600);
}
function barrelRoll(session, mode) {
  gasTo(session, mode, 45);
  for (let i = 0; i < 30; i++) drive(session, mode, { fly: true });
  for (let i = 0; i < 3; i++) drive(session, mode, { steer: -1 });
  for (let i = 0; i < 3; i++) drive(session, mode, { steer: 1 });
  until(session, mode, () => ({}), 600);
}
function nitro(session, mode) {
  for (let i = 0; i < 3; i++) drive(session, mode, { nitro: true });
  until(session, mode, () => ({ throttle: true }), 600);
}
const LESSONS = {
  throttle: (session, mode) => until(session, mode, () => ({ throttle: true })),
  left: (session, mode) => until(session, mode, () => toward(session, -7.5)),
  right: (session, mode) => until(session, mode, () => toward(session, 7.5)),
  brake: (session, mode) => until(session, mode, () => ({ brake: true })),
  drift,
  fly: (session, mode) => { gasTo(session, mode, 30); until(session, mode, () => ({ fly: true })); },
  land: (session, mode) => until(session, mode, () => ({})),
  boost, airChain, barrelRoll, nitro,
};

for (const mode of MODES) {
  test(`AUTO off: all eleven lessons complete in order on ${mode}`, () => {
    const session = createInteractiveTutorial(() => false);
    for (const step of TUTORIAL_STEPS) {
      assert.equal(session.step, step);
      LESSONS[step](session, mode);
    }
    assert.equal(session.complete, true);
    assert.equal(session.race.result, null);
  });

  for (const step of ['drift', 'fly', 'boost', 'airChain', 'barrelRoll', 'nitro']) {
    test(`AUTO off: ${step} is completable from a standstill on ${mode}`, () => {
      const session = createInteractiveTutorial(() => false);
      while (session.step !== step) { session.skip(); drive(session, mode, {}); }
      session.race.player.speed = 0;
      LESSONS[step](session, mode);
      assert.notEqual(session.step, step);
    });
  }
}
