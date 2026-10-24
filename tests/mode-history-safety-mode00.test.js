import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { MODE_HISTORY_KEY, HISTORY_LIMIT, loadModeHistory, recordModeRace, loadBests, recordBest,
  loadHistory, loadUnlocks, loadMedals, loadStars } from '../src/history.js';

const memory = entries => {
  const values = new Map(Object.entries(entries ?? {}));
  return { getItem: name => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    snapshot: () => new Map(values) };
};
const sample = (mode = 'custom', opts = {}) => {
  const race = createRace('coast', {mode, ...opts});
  race.phase = 'finished';
  race.result = {position:1,time:120,score:2000,success:true};
  return race;
};
const saved = (overrides = {}) => ({
  date:'2026-10-23T09:00:00Z',mode:'custom',track:'coast',rules:'legacy-v1',
  time:81,position:1,score:150,...overrides,
});

test('RED 10C: reject corrupted external mode history while keeping valid legacy records and the last fifty', () => {
  const older = Array.from({length:55},(_,i) => saved({time:80+i}));
  const corrupted = [
    saved({track:'unknown-track'}), saved({rules:'x'.repeat(5000)}),
    saved({time:604801}), saved({position:99}), saved({score:-100}),
    saved({time:-4}), saved({rules:''}),
  ];
  const storage = memory({[MODE_HISTORY_KEY]:JSON.stringify([...older,...corrupted])});
  const result = loadModeHistory(storage);
  assert.equal(result.length,HISTORY_LIMIT);
  assert.deepEqual(result,older.slice(-HISTORY_LIMIT));
  assert.ok(!result[0].rulesVersion, 'old mode records without metadata remain readable');
});

test('10C: variant results and blocked persistence never rewrite Classic bests or progression', () => {
  const storage = memory();
  recordBest('coast',70,storage);
  const previous = storage.snapshot();
  recordModeRace(sample('custom',{rivals:0,traffic:'off',items:false}),storage);
  recordModeRace(sample('time',{clean:true}),storage);
  assert.equal(loadBests(storage).coast,70);
  assert.deepEqual(loadHistory(storage),[]);
  assert.deepEqual(loadUnlocks(storage),['coast']);
  assert.deepEqual(loadMedals(storage),{});
  assert.deepEqual(loadStars(storage),{});
  assert.equal(loadModeHistory(storage).length,2);
  assert.notEqual(loadModeHistory(storage)[0].rules,loadModeHistory(storage)[1].rules);
  assert.deepEqual([...previous.keys()],['skyline-rush-best-tracks']);
  const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
  assert.deepEqual(recordModeRace(sample('custom',{traffic:'off'}),blocked),{best:120,record:true});
});

test('RED 10C: reject impossible new mode records before saving to storage', () => {
  const storage = memory();
  const invalid = [
    Object.assign(sample(),{trackId:'does-not-exist'}),
    Object.assign(sample(),{result:{time:604801,score:99,position:1,success:true}}),
    Object.assign(sample(),{result:{time:100,score:-1,position:1,success:true}}),
  ];
  for(const race of invalid)assert.throws(()=>recordModeRace(race,storage),/invalid|finished|track|record|result/i);
  assert.deepEqual(loadModeHistory(storage),[]);
});
