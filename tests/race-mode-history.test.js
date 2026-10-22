import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { recordModeRace, loadModeRuns, loadHistory, loadBests } from '../src/history.js';

const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
const finish = (mode, time) => {
  const race = createRace('coast', { mode });
  race.result = { time, position: 1, score: 30 };
  return race;
};

test('new-mode bests stay in their own keyed history and never touch Career', () => {
  const s = storage();
  const first = recordModeRace(finish('time', 52), s);
  const second = recordModeRace(finish('time', 58), s);
  assert.equal(first.record, true);
  assert.equal(second.record, false);
  assert.equal(second.best, 52);
  assert.equal(loadModeRuns(s).length, 2);
  assert.deepEqual(loadHistory(s), []);
  assert.deepEqual(loadBests(s), {});
});

test('Custom and Time Attack bests do not cross rule sets', () => {
  const s = storage();
  recordModeRace(finish('time', 55), s);
  assert.equal(recordModeRace(finish('custom', 100), s).record, true);
});

test('Classic, Free Drive and unfinished modes cannot write mode records', () => {
  const s = storage();
  assert.throws(() => recordModeRace(finish('classic', 42), s));
  assert.throws(() => recordModeRace(createRace('coast',{mode:'free'}), s));
  assert.deepEqual(loadModeRuns(s), []);
});

test('mode record writes are optional when browser storage is blocked', () => {
  const s = { getItem(){throw Error('blocked');}, setItem(){throw Error('blocked');} };
  assert.equal(recordModeRace(finish('time', 55), s).record, true);
});
