import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';
import { createRaceGhosts } from '../src/race-ghosts.ts';

const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
function drive(service, options = { mode: 'custom', rivals: 0, traffic: 'off', stages: 3 }, throttle = 1) {
  const race = createRace('coast', options);
  startRace(race);
  for (let frame = 0; race.phase !== 'finished' && frame < 60 * 300; frame++) {
    stepRace(race, { throttle: frame % 10 < throttle * 10, laneAssist: true }, 1 / 60);
    service.capture(race);
  }
  assert.equal(race.phase, 'finished');
  return race;
}

test('Custom stage sessions retain the fastest compatible heat Ghost, separate from Classic and Time Attack', () => {
  const storage = memory();
  const service = createRaceGhosts(storage);
  const first = drive(service);
  assert.equal(service.save(first, false), true); // A partial series has no aggregate personal best yet.
  const stored = createRaceGhosts(storage);
  assert.equal(stored.forRace(first)?.time, first.elapsed);
  assert.equal(stored.forRace(createRace('coast')), null);
  assert.equal(stored.forRace(createRace('coast', { mode: 'time' })), null);
  assert.equal(stored.forRace(createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off', stages: 2 })), null);
  const slower = drive(service, first.config, .8);
  assert.ok(slower.elapsed > first.elapsed);
  assert.equal(service.save(slower, false), false);
  assert.equal(service.forRace(slower)?.time, first.elapsed);
});

test('Ghost saves require this completed race trace; Time/Classic retain their personal-best gate', () => {
  const service = createRaceGhosts(memory());
  const race = drive(service, { mode: 'time' });
  assert.equal(service.save(race, false), false);
  assert.equal(service.save(race, true), true);
  assert.equal(service.save({ ...race }, true), false);
  assert.equal(service.forRace({ ...race, modifier: 'gold-rings' }), null);
});

test('blocked Ghost storage keeps a Custom replay available for the current page', () => {
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  const service = createRaceGhosts(blocked);
  const race = drive(service);
  assert.equal(service.save(race, false), true);
  assert.equal(service.forRace(race)?.time, race.elapsed);
  assert.equal(createRaceGhosts(blocked).forRace(race), null);
});
