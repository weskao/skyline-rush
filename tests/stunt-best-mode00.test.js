import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { loadModeHistory, loadHistory, loadUnlocks, loadStuntBest, recordModeRace } from '../src/history.ts';

const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
const finished = (track, duration, score, maxCombo, airTime) => {
  const race = createRace(track, { mode: 'stunt', duration });
  race.phase = 'finished';
  race.result = { time: duration, position: 1, success: true, score, maxCombo, airTime };
  return race;
};

test('MODE-04 RED: best stunt score, combo, air time, medal persist independently by track/ruleset', () => {
  const store = memory();
  const a = finished('coast', 120, 8200, 3, 15);
  const b = finished('coast', 120, 4100, 5, 26.5);
  const c = finished('coast', 300, 11000, 4, 40);
  const d = finished('neon', 120, 12000, 2, 12);
  for (const race of [a,b,c,d]) recordModeRace(race, store);
  assert.deepEqual(loadStuntBest('coast', a.config, store), {
    score: 8200, maxCombo: 5, airTime: 26.5, medal: 'gold',
  });
  assert.deepEqual(loadStuntBest('coast', c.config, store), {
    score: 11000, maxCombo: 4, airTime: 40, medal: 'silver',
  });
  assert.deepEqual(loadStuntBest('neon', d.config, store), {
    score: 12000, maxCombo: 2, airTime: 12, medal: 'gold',
  });
  assert.deepEqual(loadHistory(store), [], 'Stunt progress must never unlock the Classic campaign');
  assert.deepEqual(loadUnlocks(store), ['coast']);
});

test('MODE-04 RED: peak stunt metrics survive the 50-entry run-history cap', () => {
  const store = memory();
  const first = finished('coast', 120, 9800, 5, 55);
  recordModeRace(first, store);
  for (let i = 0; i < 55; i++) recordModeRace(finished('coast',120,100+i,1,2),store);
  assert.equal(loadModeHistory(store).length,50);
  assert.deepEqual(loadStuntBest('coast', first.config,store), {
    score: 9800, maxCombo: 5, airTime: 55, medal: 'gold',
  });
  assert.deepEqual(recordModeRace(finished('coast',120,300,1,2),store), {best:9800,record:false});
});

test('MODE-04 RED: invalid/blocked storage cannot produce fake stunt records or stop play', () => {
  const store = memory();
  const config = finished('coast',120,0,0,0).config;
  assert.equal(loadStuntBest('coast',config,store),null);
  store.setItem('skyline-rush-stunt-bests-v1',JSON.stringify({
    [JSON.stringify(['coast',config])]: { score: Infinity, maxCombo: '5', airTime: -1 },
  }));
  assert.equal(loadStuntBest('coast',config,store),null);
  const blocked = {getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}};
  assert.equal(loadStuntBest('coast',config,blocked),null);
  assert.deepEqual(recordModeRace(finished('coast',120,300,2,3),blocked), {best:300,record:true});
});
