import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace } from '../src/game.js';
import { createInteractiveTutorial, prepareTutorialInput } from '../src/interactive-tutorial.ts';

const DT = 1 / 60;
function tick(session, action = {}, dt = DT) {
  const input = { ...action };
  if (!['throttle', 'brake'].includes(session.step)) input.throttle = true;
  stepRace(session.race, input, dt);
  session.update(input, dt);
}
function performDrift(session) {
  const start = session.index;
  const car = session.race.player;
  const nitroBefore = car.nitro;
  for (let i = 0; i < 130; i++) tick(session, { brake: true, steer: -1 });
  assert.equal(session.index, start, 'drift is paid only on release');
  tick(session, { throttle: true });
  assert.equal(session.index, start + 1, 'real drift payout advances the lesson');
  assert.ok(car.nitro >= nitroBefore + 0.3 - 1e-6, 'two-second drift pays NITRO');
  assert.ok(car.miniBoost > 0, 'release grants a real mini boost');
}
function performAirChain(session) {
  const start = session.index;
  for (let i = 0; i < 42; i++) tick(session, { fly: true, boost: true });
  for (let i = 0; i < 250 && session.index === start; i++) tick(session);
  assert.equal(session.index, start + 1, 'air chain requires a real powered-flight landing');
}
function performBarrelRoll(session) {
  const start = session.index;
  for (let i = 0; i < 30; i++) tick(session, { fly: true });
  for (let i = 0; i < 3; i++) tick(session, { fly: true, steer: -1 });
  for (let i = 0; i < 3; i++) tick(session, { fly: true, steer: 1 });
  // Releasing thrust after the flick keeps the landing gentle while the roll finishes.
  for (let i = 0; i < 250 && session.index === start; i++) tick(session);
  assert.equal(session.index, start + 1, 'barrel roll requires an actual paid gentle landing');
}
function perform(session, action) {
  if (session.step === 'drift') performDrift(session);
  const initial = session.index;
  for (let frame = 0; frame < 600 && session.index === initial; frame++) tick(session, action);
  assert.equal(session.index, initial + 1, `did not complete ${session.step}`);
}

test('real driving completes all eleven lessons without producing a race result or changing normal races', () => {
  const normal = createRace();
  const session = createInteractiveTutorial();
  assert.equal(session.race.mode, 'free');
  assert.equal(session.race.phase, 'racing');
  assert.equal(session.race.rivals.length + session.race.traffic.length + session.race.pickups.length + session.race.rings.length, 0);
  assert.equal(session.race.player.speed, 0);
  const lessons = [
    ['throttle', { throttle: true }], ['left', { steer: -1 }],
    ['right', { steer: 1 }], ['brake', { brake: true }],
    ['drift', null], ['fly', { fly: true }], ['land', { fly: false }],
    ['boost', { boost: true }], ['airChain', null], ['barrelRoll', null], ['nitro', { nitro: true }],
  ];
  for (const [name, action] of lessons) {
    assert.equal(session.step, name);
    if (name === 'land') assert.ok(session.race.player.altitude > 1, 'landing must start from actual flight');
    if (name === 'nitro') assert.equal(session.race.player.nitro, 1);
    if (name === 'drift') performDrift(session);
    else if (name === 'airChain') performAirChain(session);
    else if (name === 'barrelRoll') performBarrelRoll(session);
    else perform(session, action);
  }
  assert.equal(session.complete, true);
  assert.equal(session.progress, 1);
  assert.equal(session.race.player.nitroUses, 1);
  assert.equal(session.race.phase, 'racing');
  assert.equal(session.race.result, null);
  assert.equal(normal.player.nitro, 0);
  assert.equal(normal.player.speed, 0);
});

test('BARREL ROLL awards the real payout after releasing FLY before steering in a controlled glide', () => {
  const session = createInteractiveTutorial();
  for (const action of [
    { throttle: true }, { steer: -1 }, { steer: 1 }, { brake: true },
    { fly: true }, { fly: false }, { boost: true },
  ]) perform(session, action);
  performAirChain(session);
  assert.equal(session.step, 'barrelRoll');
  for (let i = 0; i < 30; i++) tick(session, { fly: true });
  assert.ok(session.race.player.altitude > 1.5, 'takeoff must come from the real flight physics');
  for (let i = 0; i < 3; i++) tick(session, { steer: -1 });
  for (let i = 0; i < 3; i++) tick(session, { steer: 1 });
  assert.ok(session.race.player.trick, 'opposite airborne steering creates the real engine roll');
  for (let i = 0; i < 250 && session.step === 'barrelRoll'; i++) tick(session);
  assert.equal(session.step, 'nitro', 'the roll must complete and land gently before advancing');
  assert.ok(session.race.player.trickPayout?.nitro > 0, 'the engine must award a genuine payout');
  assert.equal(session.race.player.trickPayout.hard, false, 'a hard landing never counts');
});

test('new air-chain and barrel-roll lessons cannot inherit old flight or flick inputs', () => {
  const session = createInteractiveTutorial();
  for (const action of [
    { throttle: true }, { steer: -1 }, { steer: 1 }, { brake: true },
    { fly: true }, { fly: false },
  ]) perform(session, action);
  assert.equal(session.step, 'boost');
  const car = session.race.player;
  // Regression: the prior tutorial lesson could leave in-flight credit even
  // after the next lesson reset the altitude, producing a false chain cue.
  car.poweredFlightTime = 6;
  car.flightBoosted = true;
  perform(session, { boost: true });
  assert.equal(session.step, 'airChain');
  assert.equal(car.poweredFlightTime, 0, 'new chain attempt has no prior powered flight');
  assert.equal(car.flightBoosted, false, 'prior boost credit must not leak');
  performAirChain(session);
  assert.equal(session.step, 'barrelRoll');
  assert.equal(car.flick, null, 'previous steering edges do not start this lesson');
});

test('holding steering across an earned AIR→ROAD landing never fabricates a new flick', () => {
  const session = createInteractiveTutorial();
  for (const action of [
    { throttle: true }, { steer: -1 }, { steer: 1 }, { brake: true },
    { fly: true }, { fly: false }, { boost: true },
  ]) perform(session, action);
  assert.equal(session.step, 'airChain');
  for (let i = 0; i < 42; i++) tick(session, { fly: true, boost: true });
  const car = session.race.player;
  for (let i = 0; i < 250 && session.step === 'airChain'; i++) {
    // Start a genuine steering hold just before the engine landing event.
    const steer = car.altitude > 0 && car.verticalSpeed < 0 && car.altitude < 0.5 ? -1 : 0;
    tick(session, { steer });
  }
  assert.equal(session.step, 'barrelRoll');
  assert.equal(car.steerSign, -1, 'lesson change must preserve a physically held key');
  assert.equal(car.flick, null, 'the previous lesson flick has no credit in the new lesson');
  tick(session, { steer: -1, fly: true });
  assert.equal(car.flick, null, 'still holding left cannot be interpreted as a new press');
});

test('wrong actions reset a sustained lesson and repeated evaluation cannot fabricate driving', () => {
  const session = createInteractiveTutorial();
  for (let i = 0; i < 120; i++) tick(session);
  assert.equal(session.index, 0);
  perform(session, { throttle: true });
  for (let i = 0; i < 12; i++) tick(session, { steer: -1 });
  assert.ok(session.progress > 0 && session.progress < 1);
  tick(session, { steer: 1 });
  assert.equal(session.progress, 0);
  for (let i = 0; i < 60; i++) tick(session, { steer: 1 });
  assert.equal(session.step, 'left');
  for (let i = 0; i < 100; i++) session.update({ steer: -1 }, DT);
  assert.equal(session.progress, 0);
  perform(session, { steer: -1 });
});

test('pausing and invalid time or input cannot advance the tutorial', () => {
  const session = createInteractiveTutorial();
  perform(session, { throttle: true });
  session.race.phase = 'paused';
  for (let i = 0; i < 120; i++) tick(session, { steer: -1 });
  assert.equal(session.step, 'left');
  assert.equal(session.progress, 0);
  session.race.phase = 'racing';
  for (const dt of [0, -1, NaN, Infinity]) {
    session.update({ steer: -1 }, dt);
    assert.equal(session.progress, 0);
  }
  for (const input of [null, undefined, false, 4, 'left', { steer: NaN }]) {
    stepRace(session.race, {}, DT);
    session.update(input, DT);
  }
  assert.equal(session.index, 1);
  tick(session, { steer: -1 }, .1);
  assert.ok(session.progress > 0 && session.progress <= .125 + 1e-9, 'a stalled frame contributes at most 50 ms');
});

test('held FLY cannot complete the landing lesson and no charge cannot complete NITRO', () => {
  const session = createInteractiveTutorial();
  for (const action of [{ throttle: true }, { steer: -1 }, { steer: 1 }, { brake: true }, { fly: true }]) perform(session, action);
  for (let i = 0; i < 60; i++) tick(session, { fly: true });
  assert.equal(session.step, 'land');
  perform(session, { fly: false });
  perform(session, { boost: true });
  performAirChain(session);
  performBarrelRoll(session);
  session.race.player.nitro = 0;
  for (let i = 0; i < 60; i++) tick(session, { nitro: true });
  assert.equal(session.complete, false);
  assert.equal(session.step, 'nitro');
});

test('NITRO activation alone does not finish practice; sprint and steering stay live', () => {
  const session = createInteractiveTutorial();
  for (const action of [
    { throttle: true }, { steer: -1 }, { steer: 1 }, { brake: true },
    { fly: true }, { fly: false }, { boost: true },
  ]) perform(session, action);
  performAirChain(session);
  performBarrelRoll(session);
  const car = session.race.player;
  assert.equal(session.step, 'nitro');
  tick(session, { nitro: true });
  assert.equal(session.complete, false, 'a single NITRO press must not complete practice');
  assert.equal(session.coachPhase, 'sprinting');
  for (let i = 0; i < 12; i++) tick(session, { steer: -1 });
  assert.ok(car.steering < 0, 'real steering remains responsive throughout NITRO');
  for (let i = 0; i < 60; i++) tick(session);
  assert.equal(session.complete, false, 'less than 1.6s of sprint is insufficient');
  for (let i = 0; i < 120 && !session.complete; i++) tick(session);
  assert.equal(session.complete, true);
  assert.equal(session.race.phase, 'racing', 'simulation remains live until UI acknowledges completion');
});

test('an interrupted NITRO lesson refills only after release and remains player-controlled', () => {
  const session = createInteractiveTutorial();
  for (const action of [
    { throttle: true }, { steer: -1 }, { steer: 1 }, { brake: true },
    { fly: true }, { fly: false }, { boost: true },
  ]) perform(session, action);
  performAirChain(session);
  performBarrelRoll(session);
  const car = session.race.player;
  const previousUses = car.nitroUses;
  for (let i = 0; i < 180; i++) tick(session, { nitro: true, brake: true });
  assert.equal(session.step, 'nitro', 'braking during activation must not fake a sprint');
  assert.equal(car.nitroUses, previousUses + 1, 'one real charge was spent');
  assert.ok(car.nitro < 1, 'holding NITRO must not grant another charge');
  assert.equal(session.coachPhase, 'retry', 'the coach exposes the required release');
  tick(session);
  assert.equal(car.nitro, 1, 'practice-only charge refilled after actual release');
  assert.equal(session.coachPhase, 'ready');
  tick(session, { nitro: true });
  for (let i = 0; i < 180 && !session.complete; i++) tick(session);
  assert.equal(session.complete, true, 'a new real NITRO sprint can finish the lesson');
  assert.equal(car.nitroUses, previousUses + 2, 'second attempt must consume a real charge');
});

test('reaching the road end recovers the same lesson without advancing or stranding the car', () => {
  const session = createInteractiveTutorial();
  session.race.player.distance = session.race.length;
  session.race.phase = 'paused';
  tick(session, { throttle: true });
  assert.equal(session.race.player.distance, session.race.length);
  session.race.phase = 'racing';
  tick(session, { throttle: true });
  assert.equal(session.race.player.distance, 0);
  assert.equal(session.step, 'throttle');
  perform(session, { throttle: true });
  const distance = session.race.player.distance;
  perform(session, { steer: -1 });
  assert.ok(session.race.player.distance > distance, 'normal lesson changes must not teleport the car');
});

test('braking remains learnable after waiting long enough for the car to coast to a stop', () => {
  const session = createInteractiveTutorial();
  for (const action of [{ throttle: true }, { steer: -1 }, { steer: 1 }]) perform(session, action);
  for (let i = 0; i < 900; i++) tick(session);
  assert.equal(session.step, 'brake');
  assert.equal(session.progress, 0);
  perform(session, { brake: true });
});

test('malformed steering cannot count residual steering momentum as an action', () => {
  const session = createInteractiveTutorial();
  perform(session, { throttle: true });
  for (let i = 0; i < 10; i++) tick(session, { steer: -1 });
  tick(session, { steer: '-1' });
  assert.equal(session.progress, 0);
});

test('the steering lesson preserves the car position and steering when advancing', () => {
  const session = createInteractiveTutorial();
  perform(session, { throttle: true });
  let before = null;
  for (let frame = 0; frame < 120 && session.step === 'left'; frame++) {
    tick(session, { steer: -1 });
    if (session.step === 'left') before = { x: session.race.player.x, steering: session.race.player.steering };
  }
  assert.equal(session.step, 'right');
  assert.ok(before && before.x < -0.3, 'real left steering moves the player');
  assert.ok(Math.abs(session.race.player.x - before.x) < 0.25, 'step changes must not teleport the car sideways');
  assert.ok(session.race.player.steering < -0.5, 'step changes must not discard held steering momentum');
});

test('neutral tutorial controls do not pull left and wrong-step steering still obeys the player', () => {
  const session = createInteractiveTutorial();
  const car = session.race.player;
  const startX = car.x;
  const advance = (action = {}) => {
    const input = { ...action, laneAssist: true };
    prepareTutorialInput(input, session.step);
    assert.equal(input.laneAssist, false, 'practice must not add unrequested steering');
    stepRace(session.race, input, DT);
    session.update(input, DT);
  };
  for (let frame = 0; frame < 180; frame++) advance({ throttle: true });
  assert.equal(session.step, 'left');
  assert.ok(Math.abs(car.x - startX) < 0.001, 'no steering should retain the same lateral position');

  for (let frame = 0; frame < 18; frame++) advance({ steer: 1 });
  assert.equal(session.step, 'left', 'steering opposite the lesson must not skip it');
  assert.ok(car.x > startX + 0.3, 'players can turn right even during the left tutorial step');
  for (let frame = 0; frame < 50; frame++) advance();
  const settledX = car.x;
  for (let frame = 0; frame < 100; frame++) advance();
  assert.ok(Math.abs(car.x - settledX) < 0.001, 'once steering settles, the car must not auto-center');
});

test('drift cannot complete without a real payout and must not reward a crash', () => {
  const session = createInteractiveTutorial();
  for (const action of [{ throttle: true }, { steer: -1 }, { steer: 1 }, { brake: true }]) perform(session, action);
  assert.equal(session.step, 'drift');
  for (let i = 0; i < 80; i++) tick(session, { steer: -1 });
  assert.equal(session.step, 'drift', 'steering alone is not drifting');
  for (let i = 0; i < 30; i++) tick(session, { brake: true, steer: -1 });
  tick(session);
  assert.equal(session.step, 'drift', 'less than one second earns no payout');
  performDrift(session);
});
