import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { MODE_HISTORY_KEY, recordModeRace, loadModeHistory, loadHistory, loadUnlocks } from '../src/history.js';
import { rulesSignature } from '../src/race-config.js';

function storage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
}
function completed(mode, opts = {}) {
  const race = createRace('coast', { mode, ...opts });
  race.phase = 'finished';
  race.result = { time: 79, score: 1200, position: 1, success: true, nitroUses: 2, itemUses: 3 };
  return race;
}

test('RED 10C: every new-mode record carries a stable versioned rules identity and bounded statistics', () => {
  const store = storage();
  const race = completed('custom', { rivals: 0, traffic: 'off', items: false, stages: 3 });
  race.hazards = [{passed:true,hit:false},{passed:false,hit:true}];
  recordModeRace(race, store);
  const [run] = loadModeHistory(store);
  assert.equal(run.modeId, 'custom');
  assert.equal(run.trackId, race.trackId);
  assert.equal(run.rulesVersion, 1);
  assert.equal(run.rulesSignature, rulesSignature(race.config));
  assert.equal(run.distance, race.length);
  assert.equal(run.stageCount, 3);
  assert.equal(run.lapCount, null, 'open sprint stages are not fake laps');
  assert.equal(run.itemsUsed, 3);
  assert.equal(run.hazardPasses, 1);
  assert.equal(run.hazardHits, 1);
  assert.equal(run.time, 79);
  assert.equal(run.score, 1200);
  assert.deepEqual(loadHistory(store), []);
  assert.deepEqual(loadUnlocks(store), ['coast']);
});

test('10C: existing history formats remain readable, while new rule identities distinguish variants', () => {
  const legacy = { date:'2026-01-01T00:00:00.000Z', mode:'time', track:'coast', rules:'legacy', time:99 };
  const store=storage({[MODE_HISTORY_KEY]:JSON.stringify([legacy])});
  const timed=completed('time');
  const clean=completed('time', { clean:true });
  recordModeRace(timed, store);
  recordModeRace(clean, store);
  const saved=loadModeHistory(store);
  assert.deepEqual(saved[0],legacy,'old records stay intact');
  assert.equal(saved[1].rulesVersion,1);
  assert.notEqual(saved[1].rulesSignature,saved[2].rulesSignature,'Clean and normal trials have different rules');
  assert.deepEqual(loadHistory(store),[]);
  assert.deepEqual(loadUnlocks(store),['coast']);
});

test('10C: a complete Championship result records the actual sprint stage count, never fake circuit laps',()=>{
  const store=storage();
  const race=completed('cup',{cupTracks:['coast','neon','canyon']});
  recordModeRace(race,store);
  const [run]=loadModeHistory(store);
  assert.equal(run.modeId,'cup');
  assert.equal(run.stageCount,3);
  assert.equal(run.lapCount,null);
});

test('10C: blocked storage retains compatibility and does not prevent a new-mode result',()=>{
  const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
  const race=completed('time');
  assert.deepEqual(recordModeRace(race,blocked),{best:79,record:true});
  assert.deepEqual(loadModeHistory(blocked),[]);
});
