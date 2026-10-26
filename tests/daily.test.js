import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, dailyChallenge, DAILY_MODIFIERS, RACE_TRACKS, RING_RADIUS } from '../src/game.js';
import { recordDaily, loadDaily, dailyBoard } from '../src/history.ts';
import { createControls } from '../src/input.ts';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); } };
};
const throwingStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
const day = n => new Date(2026, 9, 1 + n, 12);

test('the daily challenge is seeded by the local date and covers every track and modifier', () => {
  assert.deepEqual(DAILY_MODIFIERS, ['no-flight', 'double-traffic', 'gold-rings']);
  assert.deepEqual(dailyChallenge(day(0)), dailyChallenge(new Date(2026, 9, 1, 23, 59)));
  assert.equal(dailyChallenge(day(0)).id, '2026-10-01');
  const challenges = Array.from({ length: 90 }, (_, n) => dailyChallenge(day(n)));
  assert.deepEqual(new Set(challenges.map(c => c.track)), new Set(Object.keys(RACE_TRACKS)));
  assert.deepEqual(new Set(challenges.map(c => c.modifier)), new Set(DAILY_MODIFIERS));
  assert.ok(new Set(challenges.map(c => `${c.track}/${c.modifier}`)).size > 6);
  // Canyon's broken bridges need flight, so it never gets the no-flight modifier.
  assert.ok(!challenges.some(c => c.track === 'canyon' && c.modifier === 'no-flight'));
});

test('no-flight keeps the car on the road even with FLY held', () => {
  const race = createRace('coast', 'no-flight');
  assert.equal(race.modifier, 'no-flight');
  startRace(race);
  for (let i = 0; i < 60 * 8; i++) stepRace(race, { throttle: true, fly: true }, 1 / 60);
  assert.equal(race.player.altitude, 0);
  assert.equal(race.player.thrusting, false);
  assert.ok(race.player.distance > 100);
});

test('double traffic doubles the traffic count and gold rings turns every ring into a gold nitro ring', () => {
  assert.equal(createRace('neon', 'double-traffic').traffic.length, createRace('neon').traffic.length * 2);
  const gold = createRace('coast', 'gold-rings');
  assert.equal(gold.rings.length, createRace('coast').rings.length);
  assert.ok(gold.rings.every(ring => ring.type === 'nitro' && ring.radius === RING_RADIUS));
  assert.equal(createRace('coast').modifier, null);
  assert.throws(() => createRace('coast', 'moon-gravity'), /Unknown modifier/);
});

test('daily runs go on their own board, fastest first, filtered to that day', () => {
  const storage = memoryStorage();
  const today = dailyChallenge(day(0));
  const race = time => ({ trackId: today.track, modifier: today.modifier, result: { position: 2, time, score: 900 } });
  recordDaily(today, race(70), storage, day(0));
  recordDaily(today, race(64.2), storage, day(0));
  recordDaily(dailyChallenge(day(1)), race(50), storage, day(1));
  const board = dailyBoard(loadDaily(storage), today.id);
  assert.deepEqual(board.map(run => run.time), [64.2, 70]);
  assert.deepEqual(Object.keys(board[0]).sort(), ['date', 'id', 'modifier', 'position', 'score', 'time', 'track']);
  assert.equal(board[0].track, today.track);
});

test('the daily board keeps 50 runs, drops malformed saved runs and survives blocked storage', () => {
  const today = dailyChallenge(day(0));
  const good = { id: today.id, track: today.track, modifier: today.modifier, time: 60, position: 1, score: 10, date: day(0).toISOString() };
  const storage = memoryStorage({ 'skyline-rush-daily': JSON.stringify([good, { ...good, time: -1 }, { ...good, id: '<img>' }, { ...good, track: 'moon' }, { ...good, position: 9 }, { ...good, modifier: 'x' }, null]) });
  assert.deepEqual(loadDaily(storage), [good]);
  for (let i = 0; i < 60; i++) recordDaily(today, { result: { position: 1, time: 60 + i, score: 1 } }, storage, day(0));
  assert.equal(loadDaily(storage).length, 50);
  assert.deepEqual(recordDaily(today, { result: { position: 1, time: 60, score: 1 } }, throwingStorage, day(0)).time, 60);
  assert.deepEqual(loadDaily(throwingStorage), []);
});

test('no-flight input clears a latched touch FLY and rejects disabled keyboard or pointer input', () => {
  const target = new EventTarget();
  const flyButton = new EventTarget();
  flyButton.disabled = false;
  const controls = createControls(target, () => {}, { getSettings: () => ({ mode: 'buttons' }) });
  controls.bindButton(flyButton, 'fly');
  controls.setFlyMode('toggle');
  const press = (element, type, values = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, values);
    element.dispatchEvent(event);
  };
  try {
    press(flyButton, 'pointerdown', { pointerId: 1, pointerType: 'touch' });
    assert.equal(controls.read().fly, true, 'touch toggle starts engaged');
    controls.setFlyEnabled(false);
    flyButton.disabled = true;
    assert.equal(controls.read().fly, false, 'the previous toggle was cleared');
    press(flyButton, 'pointerdown', { pointerId: 2, pointerType: 'touch' });
    press(target, 'keydown', { code: 'Space' });
    assert.equal(controls.read().fly, false, 'neither keyboard nor disabled touch can fly');
    press(target, 'keyup', { code: 'Space' });
    controls.setFlyEnabled(true);
    flyButton.disabled = false;
    assert.equal(controls.read().fly, false, 'FLY remains off when the restriction ends');
    press(target, 'keydown', { code: 'Space' });
    assert.equal(controls.read().fly, true, 'regular flight keyboard control is restored');
    press(target, 'keyup', { code: 'Space' });
    press(flyButton, 'pointerdown', { pointerId: 3, pointerType: 'touch' });
    assert.equal(controls.read().fly, true, 'touch toggle still works in normal races');
  } finally {
    controls.destroy();
  }
});
