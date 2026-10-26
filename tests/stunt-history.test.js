import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { stuntMedal } from '../src/stunt-attack.ts';
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

test('Stunt medals scale to timed challenge duration and distinguish tiers', () => {
  
  assert.equal(stuntMedal(1499, 120), null);
  assert.equal(stuntMedal(1500, 120), 'bronze');
  assert.equal(stuntMedal(4000, 120), 'silver');
  assert.equal(stuntMedal(8000, 120), 'gold');
  assert.equal(stuntMedal(4000, 300), 'bronze');
  assert.equal(stuntMedal(8000, 300), 'bronze');
  assert.equal(stuntMedal(8000, 180), 'silver');
});

test('Stunt histories save combo, air time and medal without affecting Career', () => {
  const store = memory();
  const race = finished('stunt', 120, 9000);
  race.result.maxCombo = 5;
  race.result.airTime = 34.5;
  recordModeRace(race, store);
  const [run] = loadModeHistory(store);
  assert.equal(run.maxCombo, 5);
  assert.equal(run.airTime, 34.5);
  assert.equal(run.medal, 'gold');
  assert.deepEqual(loadHistory(store), []);
  assert.deepEqual(loadUnlocks(store), ['coast']);
});
