import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { loadModeHistory, recordModeRace, loadHistory, loadUnlocks } from '../src/history.js';

const memory = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value) };
};
function finished(mode, time, score) {
  const race = createRace('coast', { mode });
  race.phase = 'finished';
  race.result = { time, score, position: 1, success: true };
  return race;
}

test('Stunt Attack personal records favor high scores, not fastest time', () => {
  const store = memory();
  assert.deepEqual(recordModeRace(finished('stunt', 120, 1000), store), {best:1000, record:true});
  assert.deepEqual(recordModeRace(finished('stunt', 90, 950), store), {best:1000, record:false});
  assert.deepEqual(recordModeRace(finished('stunt', 120, 1300), store), {best:1300, record:true});
  assert.equal(loadModeHistory(store).length, 3);
  assert.deepEqual(loadHistory(store), []);
  assert.deepEqual(loadUnlocks(store), ['coast']);
});

test('Stunt Attack records are never conflated with Time Attack best time', () => {
  const store = memory();
  recordModeRace(finished('stunt', 120, 2000), store);
  assert.deepEqual(recordModeRace(finished('time', 58, 100), store), {best:58,record:true});
  assert.deepEqual(recordModeRace(finished('time', 62, 5000), store), {best:58,record:false});
  assert.equal(loadModeHistory(store).length, 3);
});

test('invalid scoring never persists and disabled storage never crashes a session', () => {
  const store = memory();
  assert.throws(()=>recordModeRace(finished('stunt',120,NaN), store));
  assert.equal(loadModeHistory(store).length, 0);
  const blocked = {getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};
  assert.deepEqual(recordModeRace(finished('stunt',120,300), blocked),{best:300,record:true});
});
