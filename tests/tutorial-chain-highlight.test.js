import test from 'node:test';
import assert from 'node:assert/strict';
import { stepRace } from '../src/game.js';
import { createInteractiveTutorial, TUTORIAL_STEPS } from '../src/interactive-tutorial.ts';
import { tutorialCue } from '../src/tutorial-cues.ts';
import { tutorialTouchControls } from '../src/tutorial-ui.ts';

const DT = 1 / 60;
function tick(session, action = {}) {
  stepRace(session.race, { throttle: true, ...action }, DT);
  session.update({ throttle: true, ...action }, DT);
}
// Phone outline + ripple for the air chain lesson, as renderTutorial picks it (the pre-cue fallback is FLY).
const lit = session => tutorialTouchControls(session.step, session.cue, 'fly').join('+');
// Collapse a per-tick trace into its distinct runs: [cue key, lit controls].
function runs(trace) {
  return trace.filter((entry, i) => i === 0 || entry.join() !== trace[i - 1].join());
}
// One air chain attempt: take off on FLY alone, BOOST when the cue says so, release when told, coast to the ground.
function attempt(session) {
  const car = session.race.player, trace = [];
  const record = () => trace.push([session.cue?.key, lit(session)]);
  for (let i = 0; i < 600 && car.speed < 70; i++) tick(session);
  record();
  for (let i = 0; i < 120 && session.cue?.key !== 'tutorial.cue.chainBoost'; i++) { tick(session, { fly: true }); record(); }
  for (let i = 0; i < 120 && session.coachPhase !== 'airborne'; i++) { tick(session, { fly: true, boost: true }); record(); }
  for (let i = 0; i < 400 && car.altitude > 0; i++) { tick(session); record(); }
  return runs(trace);
}
function airChainSession() {
  const session = createInteractiveTutorial();
  for (let i = 0; i < TUTORIAL_STEPS.length && session.step !== 'airChain'; i++) { session.skip(); tick(session); }
  return session;
}

test('air chain: FLY lights before take-off, then BOOST + NITRO replace it the moment the cue says BOOST', () => {
  const trace = attempt(airChainSession());
  const at = key => trace.find(([cue]) => cue === key);
  assert.deepEqual(at('tutorial.cue.chainFly'), ['tutorial.cue.chainFly', 'fly']);
  assert.deepEqual(at('tutorial.cue.chainBoost'), ['tutorial.cue.chainBoost', 'boost+nitro'], 'FLY is already held: only BOOST/NITRO pulse');
  assert.deepEqual(at('tutorial.cue.chainHold'), ['tutorial.cue.chainHold', 'boost+nitro']);
  assert.deepEqual(at('tutorial.cue.chainRelease'), ['tutorial.cue.chainRelease', ''], 'releasing FLY is not a press: nothing pulses');
  for (const [cue, controls] of trace) {
    if (cue && cue !== 'tutorial.cue.chainFly') assert.doesNotMatch(controls, /fly/, `${cue} must not keep the FLY ripple`);
  }
});

test('air chain: every retry and a re-entered lesson replay the same cue → highlight sequence', () => {
  const short = session => { // thrust cut before the chain counted: the landing cue, then a fresh take-off
    const car = session.race.player, trace = [];
    for (let i = 0; i < 600 && car.speed < 70; i++) tick(session);
    for (let i = 0; i < 20; i++) { tick(session, { fly: true }); trace.push([session.cue?.key, lit(session)]); }
    for (let i = 0; i < 400 && car.altitude > 0; i++) { tick(session); trace.push([session.cue?.key, lit(session)]); }
    for (let i = 0; i < 30; i++) { tick(session); trace.push([session.cue?.key, lit(session)]); }
    return runs(trace);
  };
  const session = airChainSession();
  const first = short(session), second = short(session);
  assert.deepEqual(second, first, 'a retry gives the same highlights');
  assert.ok(first.some(([cue, controls]) => cue === 'tutorial.cue.chainLanding' && controls === ''), 'too-early landing lights nothing');
  assert.deepEqual(first.at(-1), [first.at(-1)[0], 'fly'], 'back on the ground FLY pulses again');
  assert.deepEqual(attempt(airChainSession()), attempt(airChainSession()), 're-entering the lesson replays it identically');
});

test('only the air chain follows its cue; other lessons and cue-less moments keep their own control', () => {
  const car = { altitude: 2, thrusting: true, flightBoosted: false, poweredFlightTime: 0, drift: null, speed: 70 };
  const boostCue = tutorialCue({ step: 'airChain', phase: 'ready', car, countdown: null, stretchEntered: false, driftEntry: 50 });
  assert.deepEqual(tutorialTouchControls('airChain', null, 'fly'), ['fly'], 'countdown / pass toast: no cue yet');
  assert.deepEqual(tutorialTouchControls('airChain', boostCue, 'fly'), ['boost', 'nitro']);
  assert.deepEqual(tutorialTouchControls('barrelRoll', { key: 'tutorial.cue.rollFly', actions: ['fly'] }, 'fly'), ['fly']);
  assert.deepEqual(tutorialTouchControls('drift', { key: 'tutorial.cue.driftStart', actions: ['brake'] }, 'drift'), ['drift']);
  assert.deepEqual(tutorialTouchControls('land', null, null), []);
});
