import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace } from '../src/game.js';
import { createInteractiveTutorial } from '../src/interactive-tutorial.js';

const DT = 1 / 60;
function tick(session, action = {}, dt = DT) {
  const input = { ...action };
  if (!['throttle', 'brake'].includes(session.step)) input.throttle = true;
  stepRace(session.race, input, dt);
  session.update(input, dt);
}
function perform(session, action) {
  const initial = session.index;
  for (let frame = 0; frame < 600 && session.index === initial; frame++) tick(session, action);
  assert.equal(session.index, initial + 1, `did not complete ${session.step}`);
}

test('real driving completes all eight lessons without producing a race result or changing normal races', () => {
  const normal = createRace();
  const session = createInteractiveTutorial();
  assert.equal(session.race.mode, 'free');
  assert.equal(session.race.phase, 'racing');
  assert.equal(session.race.rivals.length + session.race.traffic.length + session.race.pickups.length + session.race.rings.length, 0);
  assert.equal(session.race.player.speed, 0);
  const lessons = [
    ['throttle', { throttle: true }], ['left', { steer: -1 }],
    ['right', { steer: 1 }], ['brake', { brake: true }],
    ['fly', { fly: true }], ['land', { fly: false }],
    ['boost', { boost: true }], ['nitro', { nitro: true }],
  ];
  for (const [name, action] of lessons) {
    assert.equal(session.step, name);
    if (name === 'land') assert.ok(session.race.player.altitude > 1, 'landing must start from actual flight');
    if (name === 'nitro') assert.equal(session.race.player.nitro, 1);
    perform(session, action);
  }
  assert.equal(session.complete, true);
  assert.equal(session.progress, 1);
  assert.equal(session.race.player.nitroUses, 1);
  assert.equal(session.race.phase, 'racing');
  assert.equal(session.race.result, null);
  assert.equal(normal.player.nitro, 0);
  assert.equal(normal.player.speed, 0);
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
  session.race.player.nitro = 0;
  for (let i = 0; i < 60; i++) tick(session, { nitro: true });
  assert.equal(session.complete, false);
  assert.equal(session.step, 'nitro');
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
