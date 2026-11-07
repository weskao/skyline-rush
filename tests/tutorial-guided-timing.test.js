import test from 'node:test';
import assert from 'node:assert/strict';
import { stepRace } from '../src/game.js';
import { createRaceAudioEvents } from '../src/race-audio-events.ts';
import { createInteractiveTutorial, TUTORIAL_STEPS } from '../src/interactive-tutorial.ts';
import { BOOST_LIMIT } from '../src/tutorial-gates.ts';
import { tutorialCue } from '../src/tutorial-cues.ts';
import { createClearChime, rewardParts } from '../src/tutorial-ui.ts';

const DT = 1 / 60;
function tick(session, action = {}) {
  const input = { ...action };
  if (session.step !== 'throttle' && !input.brake) input.throttle = true;
  stepRace(session.race, input, DT);
  session.update(input, DT);
}
function skipTo(session, name) {
  for (let i = 0; i < TUTORIAL_STEPS.length && session.step !== name; i++) { session.skip(); tick(session); }
  assert.equal(session.step, name);
}
const live = session => session.race.rings.filter(ring => !ring.hit);

test('throttle lesson: the car stands still after GO until THROTTLE, and the arrow points ahead', () => {
  const session = createInteractiveTutorial();
  session.race.phase = 'countdown'; // main.js runs the same 3-2-1 → GO as a race
  for (let i = 0; i < 4 * 60; i++) tick(session);
  assert.equal(session.race.phase, 'racing');
  assert.equal(session.race.player.speed, 0, 'no GO roll in practice: the player starts it');
  assert.equal(session.guide, 'ahead');
  assert.equal(tutorialCue({ step: 'throttle', phase: 'ready', car: session.race.player, countdown: null, stretchEntered: false, driftEntry: 50 })?.key, 'tutorial.cue.throttle');
  tick(session, { throttle: true });
  assert.ok(session.race.player.speed > 0 && session.race.player.speed < 1, 'speed builds at the normal throttle rate');
});

test('a gate ring hit stays visible to the audio and effects that run after the step', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'left');
  const audio = createRaceAudioEvents(), heard = [];
  audio.update(session.race, true);
  for (let i = 0; i < 900 && session.step === 'left'; i++) {
    tick(session, { steer: -1 });
    heard.push(...audio.update(session.race, true).sounds);
  }
  assert.equal(session.step, 'right');
  assert.ok(session.race.rings.some(ring => ring.hit && ring.x < 0), 'the collected ring is kept, so effects.js bursts it');
  assert.ok(heard.includes('ring-charge'), 'passing a practice gate chimes like any ring');
  assert.deepEqual(live(session).map(ring => ring.x), [7.5]);
});

test('lesson changes never move the car: only rings and lesson state change', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'brake');
  const car = session.race.player;
  car.x = 3.2; car.altitude = 4; car.verticalSpeed = 1;
  session.skip(); tick(session);
  assert.equal(session.step, 'drift');
  assert.ok(Math.abs(car.x - 3.2) < 0.2, 'drift lesson keeps the lane');
  assert.ok(car.altitude > 3, 'a new lesson does not snap the car to the road');
});

test('boost lesson: a timed stretch of blue charge-ring rows, no auto-dash, refilled but finite BOOST', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'boost');
  const car = session.race.player;
  const rings = live(session);
  assert.ok(rings.length >= 30 && rings.every(ring => ring.type === 'charge'), 'continuous blue rows');
  assert.equal(session.countdown, BOOST_LIMIT, 'the clock waits for the stretch');
  assert.equal(session.guide, 'ahead');
  // Coasting through on the throttle alone runs out the clock: same stretch logic re-arms ahead.
  const firstEnd = Math.max(...rings.map(ring => ring.distance));
  for (let i = 0; i < 1200 && session.coachReason !== 'timeout'; i++) tick(session);
  assert.equal(session.coachReason, 'timeout');
  assert.equal(session.step, 'boost');
  assert.ok(Math.min(...live(session).map(ring => ring.distance)) > car.distance, 'a fresh stretch waits ahead');
  assert.ok(car.distance < firstEnd);
  assert.equal(car.miniBoost, 0, 'charge rings never grant the slipstream auto-dash');
  // BOOST is the normal meter: it drains while held.
  car.fuel = 100;
  for (let i = 0; i < 20; i++) tick(session, { boost: true });
  assert.ok(car.fuel < 100, 'BOOST drains as in a race');
  for (let i = 0; i < 1200 && session.step === 'boost'; i++) tick(session, { boost: true });
  assert.equal(session.step, 'airChain', 'holding BOOST beats the clock');
});

test('effect lessons advance only after their boost or NITRO has fully played out', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'airChain');
  const car = session.race.player;
  for (let i = 0; i < 600 && car.speed < 70; i++) tick(session);
  const seen = new Set([session.cue?.key]);
  for (let i = 0; i < 42; i++) { tick(session, { fly: true, boost: true }); seen.add(session.cue?.key); }
  let finishing = false;
  for (let i = 0; i < 400 && session.step === 'airChain'; i++) {
    tick(session);
    seen.add(session.cue?.key);
    if (session.coachPhase === 'finishing') { finishing = true; assert.ok(car.miniBoost > 0, 'still waiting on the chain boost'); }
  }
  assert.equal(session.step, 'barrelRoll');
  assert.ok(finishing, 'the chain boost played out before the next lesson');
  assert.equal(car.miniBoost, 0);
  for (const key of ['tutorial.cue.chainFly', 'tutorial.cue.chainRelease', 'tutorial.cue.finishing']) assert.ok(seen.has(key), key);
});

test('drift and air chain cues name the next action at the right moment', () => {
  const base = { phase: 'ready', countdown: null, stretchEntered: false, driftEntry: 50 };
  const car = (fields = {}) => ({ altitude: 0, thrusting: false, flightBoosted: false, poweredFlightTime: 0, drift: null, speed: 70, ...fields });
  const cue = (step, fields, extra = {}) => tutorialCue({ ...base, step, car: car(fields), ...extra });
  assert.deepEqual(cue('drift', { speed: 30 }), { key: 'tutorial.cue.driftSpeed', actions: ['brake'] });
  assert.deepEqual(cue('drift', {}), { key: 'tutorial.cue.driftStart', actions: ['brake', 'left', 'right'] });
  assert.deepEqual(cue('drift', { drift: { time: 0.4 } }), { key: 'tutorial.cue.driftHold', actions: ['brake'], count: 0.6 });
  assert.deepEqual(cue('drift', { drift: { time: 1.2 } }), { key: 'tutorial.cue.driftRelease', actions: ['brake'], n: 1 });
  assert.deepEqual(cue('drift', { drift: { time: 3.1 } }), { key: 'tutorial.cue.driftMax', actions: ['brake'] });
  assert.equal(cue('airChain', {}).key, 'tutorial.cue.chainFly');
  assert.deepEqual(cue('airChain', { altitude: 2, thrusting: true }), { key: 'tutorial.cue.chainBoost', actions: ['boost'] });
  assert.deepEqual(cue('airChain', { altitude: 2, thrusting: true, flightBoosted: true, poweredFlightTime: 0.1 }), { key: 'tutorial.cue.chainHold', actions: ['fly', 'boost'], count: 0.3 });
  assert.deepEqual(cue('airChain', { altitude: 2, thrusting: true, flightBoosted: true, poweredFlightTime: 0.5 }, { phase: 'airborne' }), { key: 'tutorial.cue.chainRelease', actions: ['fly'] });
  assert.equal(cue('airChain', { altitude: 2 }).key, 'tutorial.cue.chainLanding');
  assert.deepEqual(cue('boost', {}, { countdown: BOOST_LIMIT }), { key: 'tutorial.cue.boostAhead', actions: ['boost'], n: BOOST_LIMIT });
  assert.deepEqual(cue('boost', {}, { countdown: 3.04, stretchEntered: true }), { key: 'tutorial.cue.boostGo', actions: ['boost'], count: 3 });
  assert.deepEqual(cue('left', {}, { phase: 'finishing' }), { key: 'tutorial.cue.finishing', actions: [] });
  assert.equal(cue('left', {}), null);
});

test('every cleared lesson is counted once for the chime and named for the pass toast', () => {
  const session = createInteractiveTutorial();
  const chime = createClearChime();
  assert.equal(chime(session), false, 'a new session starts silent');
  for (let i = 0; i < 120 && session.step === 'throttle'; i++) tick(session, { throttle: true });
  assert.equal(session.clears, 1);
  assert.equal(session.clearedStep, 'throttle', 'the pass toast names the lesson just cleared');
  assert.equal(chime(session), true);
  assert.equal(chime(session), false, 'one chime per clear');
  session.skip(); tick(session);
  assert.equal(session.clears, 1, 'a skip is not a pass');
  assert.equal(createClearChime()(createInteractiveTutorial()), false, 'a fresh practice never replays old clears');
});

test('barrel roll cues track altitude and fall speed so a hard landing can be avoided', () => {
  const base = { countdown: null, stretchEntered: false, driftEntry: 50 };
  const car = (fields = {}) => ({ altitude: 0, thrusting: false, flightBoosted: false, poweredFlightTime: 0, drift: null, speed: 70, verticalSpeed: 0, ...fields });
  const cue = (phase, fields) => tutorialCue({ ...base, step: 'barrelRoll', phase, car: car(fields) })?.key;
  assert.equal(cue('ready', {}), 'tutorial.cue.rollFly');
  assert.equal(cue('ready', { altitude: 2, thrusting: true }), 'tutorial.cue.rollClimb');
  assert.equal(cue('ready', { altitude: 5, thrusting: true }), 'tutorial.cue.rollRelease');
  assert.equal(cue('ready', { altitude: 5 }), 'tutorial.cue.rollFlick');
  assert.equal(cue('flicked', { altitude: 5 }), 'tutorial.cue.rollOpposite');
  assert.equal(cue('rolling', { altitude: 4 }), 'tutorial.cue.rollSpin');
  assert.equal(cue('readyToLand', { altitude: 3, verticalSpeed: -10 }), 'tutorial.cue.rollSoften', 'falling near the hard-landing speed');
  assert.equal(cue('readyToLand', { altitude: 3, verticalSpeed: -4 }), 'tutorial.cue.rollLand');
});

test('NITRO rewards in coach copy are split out for highlighting without changing the text', () => {
  assert.deepEqual(rewardParts('Glide down to earn +0.25 NITRO.'), [{ text: 'Glide down to earn ', reward: false }, { text: '+0.25 NITRO', reward: true }, { text: '.', reward: false }]);
  assert.deepEqual(rewardParts('即可獲得 0.25 格 NITRO。').filter(part => part.reward).map(part => part.text), ['0.25 格 NITRO']);
  assert.deepEqual(rewardParts('No reward here'), [{ text: 'No reward here', reward: false }]);
});

test('brake lesson cue: red gate ahead, then keep holding while braking', () => {
  const car = { altitude: 0, thrusting: false, flightBoosted: false, poweredFlightTime: 0, drift: null, speed: 40 };
  const cue = braking => tutorialCue({ step: 'brake', phase: 'ready', car: { ...car, braking }, countdown: null, stretchEntered: false, driftEntry: 50 });
  assert.deepEqual(cue(false), { key: 'tutorial.cue.brakeAhead', actions: ['brake'] });
  assert.deepEqual(cue(true), { key: 'tutorial.cue.brakeHold', actions: ['brake'] });
});
