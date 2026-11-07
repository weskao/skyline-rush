import test from 'node:test';
import assert from 'node:assert/strict';
import { stepRace, DRIFT_MIN_SPEED } from '../src/game.js';
import { streamEndless, finishEndless } from '../src/endless-highway.ts';
import { createInteractiveTutorial, CLEARED_SECONDS, TUTORIAL_STEPS } from '../src/interactive-tutorial.ts';
import { tutorialInstructionKey } from '../src/tutorial-ui.ts';

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
// Lessons keep the player's own speed, so a skipped-to lesson first cruises up like a real player would.
function cruiseTo(session, speed) {
  for (let i = 0; i < 600 && session.race.player.speed < speed; i++) tick(session);
  assert.ok(session.race.player.speed >= speed);
}
// Collected rings stay briefly in race.rings (for the chime and burst); the live gate is the unhit one.
const live = session => session.race.rings.filter(ring => !ring.hit);
function driveToGate(session, action) {
  const start = session.index, gate = live(session)[0].distance;
  for (let i = 0; i < 900 && session.index === start && session.race.player.distance <= gate; i++) tick(session, action);
}

test('left and right lessons are lane gates the arrow points to', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'left');
  assert.deepEqual(live(session).map(ring => ring.x), [-7.5]);
  assert.equal(session.guide, 'left');
  driveToGate(session, { steer: -1 });
  assert.equal(session.step, 'right', 'steering into the left gate clears the lesson');
  assert.deepEqual(live(session).map(ring => ring.x), [7.5]);
  assert.equal(session.guide, 'right');
  driveToGate(session, { steer: 1 });
  assert.equal(session.step, 'brake');
});

test('the brake gate spans the road and needs the action held while passing', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'brake');
  assert.equal(live(session).length, 4, 'a full-width row');
  assert.equal(session.guide, 'slow', 'braking gets its own slow-down arrow, not the go-ahead one');
  driveToGate(session, {});
  assert.equal(session.step, 'brake');
  assert.equal(session.coachReason, 'noBrake', 'coasting through is named, not silently ignored');
  tick(session);
  driveToGate(session, { brake: true });
  assert.equal(session.step, 'drift', 'a held brake crawls through the gate and clears it');
});

test('practice gates never pay a PERFECT LINE bonus', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'left');
  const car = session.race.player, nitro = car.nitro, lines = car.perfectLines;
  driveToGate(session, { steer: -1 });
  assert.equal(car.perfectLines, lines);
  assert.equal(car.nitro, nitro);
});

test('a cleared lesson shows praise briefly while the next lesson already listens', () => {
  const session = createInteractiveTutorial();
  for (let i = 0; i < 120 && session.step === 'throttle'; i++) tick(session, { throttle: true });
  assert.equal(session.step, 'left');
  assert.equal(session.coachPhase, 'cleared');
  for (let i = 0; i < Math.ceil(CLEARED_SECONDS / DT) + 1; i++) tick(session);
  assert.equal(session.coachPhase, 'ready', 'the praise ends after the short pause');
});

test('skip advances one lesson on the next tick and skipping the last completes practice', () => {
  const session = createInteractiveTutorial();
  session.skip();
  assert.equal(session.step, 'throttle', 'nothing changes until the simulation ticks');
  tick(session);
  assert.equal(session.step, 'left');
  assert.equal(session.coachPhase, 'ready', 'a skip is not praised as a success');
  skipTo(session, 'nitro');
  session.skip(); tick(session);
  assert.equal(session.complete, true);
  session.skip(); tick(session);
  assert.equal(session.complete, true, 'skip after completion is a no-op');
});

test('the air chain lesson supplies unlimited FLY, BOOST and NITRO, and NITRO alone powers a chain', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'airChain');
  cruiseTo(session, DRIFT_MIN_SPEED);
  const car = session.race.player;
  assert.equal(car.nitro, 1, 'a NITRO charge is ready from the start');
  for (let i = 0; i < 30; i++) tick(session, { fly: true });
  tick(session, { fly: true, nitro: true });
  for (let i = 0; i < 30; i++) tick(session, { fly: true });
  assert.equal(car.fuel, 100, 'FLY never drains in this lesson');
  assert.ok(car.nitro >= 1, 'the spent NITRO charge is refilled');
  for (let i = 0; i < 400 && session.step === 'airChain'; i++) tick(session);
  assert.equal(session.step, 'barrelRoll', 'FLY + NITRO then a glide earns the chain');
  assert.equal(car.nitro, 0, 'the practice supply does not leak into the next lesson');
});

test('a drift released before the first payout tier is named as too short', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'drift');
  cruiseTo(session, DRIFT_MIN_SPEED + 5);
  for (let i = 0; i < 20; i++) tick(session, { brake: true, steer: -1 });
  tick(session);
  assert.equal(session.step, 'drift');
  assert.equal(session.coachReason, 'short');
});

test('a drift tried below drift speed is named as too slow, and clears once a real drift starts', () => {
  const session = createInteractiveTutorial();
  skipTo(session, 'drift');
  assert.ok(session.race.player.speed < DRIFT_MIN_SPEED, 'skipped lessons keep the real low speed');
  tick(session, { brake: true, steer: -1 });
  assert.equal(session.coachPhase, 'retry');
  assert.equal(session.coachReason, 'slow');
  assert.equal(tutorialInstructionKey('drift', 'retry', 'slow', false), 'tutorial.driftRetry.slow');
  cruiseTo(session, DRIFT_MIN_SPEED + 5);
  tick(session, { brake: true, steer: -1 });
  assert.ok(session.race.player.drift, 'a real drift starts at speed');
  assert.equal(session.coachReason, null);
});

test('practice borrows the endless road: no streaming encounters and no collision limit', () => {
  const session = createInteractiveTutorial();
  const race = session.race;
  race.player.distance = 5000;
  streamEndless(race);
  assert.equal(race.traffic.length + race.pickups.length, 0);
  race.player.collisions = 20;
  assert.equal(finishEndless(race), false);
});

test('the coach names the reason for a retry and praises a cleared lesson', () => {
  assert.equal(tutorialInstructionKey('left', 'retry', 'missed', false), 'tutorial.gateMissed');
  assert.equal(tutorialInstructionKey('airChain', 'retry', 'hard', false), 'tutorial.airChainRetry.hard');
  assert.equal(tutorialInstructionKey('brake', 'cleared', null, false), 'tutorial.cleared');
  assert.equal(tutorialInstructionKey('nitro', 'retry', null, false), 'tutorial.nitroRetry');
  assert.equal(tutorialInstructionKey('airChain', 'airborne', null, false), 'tutorial.airChainAirborne');
  assert.equal(tutorialInstructionKey(null, 'ready', null, true), 'tutorial.completedCopy');
});

test('every retry reason the lessons can report has copy in both languages', async () => {
  const { TUTORIAL_COPY } = await import('../src/locales/tutorial-copy.ts');
  const reasons = { left: ['missed'], right: ['missed'], brake: ['missed', 'noBrake'], boost: ['timeout'],
    drift: ['short'], airChain: ['noBoost', 'short', 'hard', 'slow'], barrelRoll: ['noRoll', 'early', 'hard'] };
  for (const [step, list] of Object.entries(reasons)) for (const reason of list) {
    const key = tutorialInstructionKey(step, 'retry', reason, false);
    for (const locale of ['en', 'zh-TW']) assert.ok(TUTORIAL_COPY[locale][key], `${locale} ${key}`);
  }
  for (const locale of ['en', 'zh-TW']) assert.ok(TUTORIAL_COPY[locale]['tutorial.cleared'] && TUTORIAL_COPY[locale]['tutorial.skipStep']);
});
