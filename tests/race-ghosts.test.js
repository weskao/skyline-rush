import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';
import { createGhostStore } from '../src/ghost-store.ts';
import { recordGhost } from '../src/ghost.ts';

const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
beforeEach(() => { globalThis.localStorage = memory(); });
afterEach(() => { delete globalThis.localStorage; });

function drive(options = { mode: 'custom', rivals: 0, traffic: 'off', stages: 3 }, throttle = 1) {
  const race = createRace('coast', options);
  const samples = [];
  startRace(race);
  for (let frame = 0; race.phase !== 'finished' && frame < 60 * 300; frame++) {
    stepRace(race, { throttle: frame % 10 < throttle * 10, laneAssist: true }, 1 / 60);
    recordGhost(samples, race);
  }
  assert.equal(race.phase, 'finished');
  return { race, ghost: { time: race.elapsed, samples } };
}

test('Custom stage sessions retain the fastest compatible heat Ghost, separate from Classic and Time Attack', () => {
  const service = createGhostStore();
  const first = drive();
  assert.equal(service.saveCustom?.(first.race, first.ghost), true);
  const stored = createGhostStore();
  assert.equal(stored.mode(first.race)?.time, first.race.elapsed);
  assert.equal(stored.classic('coast'), null);
  assert.equal(stored.mode(createRace('coast', { mode: 'time' })), null);
  assert.equal(stored.mode(createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off', stages: 2 })), null);
  const slower = drive(first.race.config, .8);
  assert.ok(slower.race.elapsed > first.race.elapsed);
  assert.equal(service.saveCustom?.(slower.race, slower.ghost), false);
  assert.equal(service.mode(slower.race)?.time, first.race.elapsed);
});

test('Custom Ghost rejects unfinished/failed heats and malformed traces', () => {
  const service = createGhostStore();
  const { race, ghost } = drive();
  assert.equal(service.saveCustom?.({ ...race, phase: 'paused' }, ghost), false);
  assert.equal(service.saveCustom?.({ ...race, result: { ...race.result, success: false } }, ghost), false);
  assert.equal(service.saveCustom?.(race, { ...ghost, samples: [] }), false);
  assert.equal(service.saveCustom?.(race, ghost), true);
  assert.equal(service.mode(race)?.time, race.elapsed);
});

test('blocked Ghost storage keeps a Custom replay available for the current page', () => {
  globalThis.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  const service = createGhostStore();
  const { race, ghost } = drive();
  assert.equal(service.saveCustom?.(race, ghost), true);
  assert.equal(service.mode(race)?.time, race.elapsed);
  assert.equal(createGhostStore().mode(race), null);
});
