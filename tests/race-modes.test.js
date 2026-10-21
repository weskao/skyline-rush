import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRaceConfig, MODES } from '../src/race-config.js';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';

test('normalization keeps classic defaults and validates mode names', () => {
  const config = normalizeRaceConfig();
  assert.equal(config.mode, 'classic');
  assert.equal(config.rivals, 3);
  assert.equal(config.traffic, 'normal');
  assert.equal(config.items, true);
  assert.equal(config.difficulty, 'normal');
  assert.equal(config.rulesVersion, 1);
  assert.ok(MODES.includes('free'));
  assert.throws(() => normalizeRaceConfig({ mode: 'unknown' }), /mode/i);
});

test('custom settings are bounded and have deterministic safe defaults', () => {
  assert.deepEqual(normalizeRaceConfig({ mode: 'custom', rivals: 0, traffic: 'off', items: false }).rivals, 0);
  assert.equal(normalizeRaceConfig({ mode: 'custom', rivals: 20 }).rivals, 3);
  assert.equal(normalizeRaceConfig({ mode: 'custom', traffic: 'garbage' }).traffic, 'normal');
  assert.equal(normalizeRaceConfig({ mode: 'time', rivals: 3 }).rivals, 0);
  assert.equal(normalizeRaceConfig({ mode: 'free', rivals: 1 }).rivals, 0);
});

test('classic and Daily Challenge physics and traffic remain unchanged', () => {
  const classic = createRace('coast');
  const daily = createRace('coast', 'double-traffic');
  assert.equal(classic.mode, 'classic');
  assert.equal(classic.modifier, null);
  assert.equal(classic.rivals.length, 3);
  assert.equal(classic.traffic.length, 36);
  assert.equal(daily.modifier, 'double-traffic');
  assert.equal(daily.traffic.length, 72);
  assert.deepEqual(classic.rings.map(ring => ring.distance), createRace('coast').rings.map(ring => ring.distance));
});

test('custom race creates zero rivals and no random traffic or items on demand', () => {
  const race = createRace('neon', { mode: 'custom', rivals: 0, traffic: 'off', items: false });
  assert.equal(race.mode, 'custom');
  assert.equal(race.rivals.length, 0);
  assert.equal(race.traffic.length, 0);
  assert.equal(race.pickups.length, 0);
  assert.ok(race.rings.length > 0);
  assert.equal(race.config.items, false);
});

test('custom race preserves selected AI count and normal track configuration', () => {
  const race = createRace('aurora', { mode: 'custom', rivals: 2, traffic: 'light', difficulty: 'hard' });
  assert.deepEqual(race.rivals.map(r => r.name), ['NOVA', 'ORBIT']);
  assert.equal(race.traffic.length, Math.round(36 * RACE_TRACKS.aurora.trafficDensity * 0.5));
  assert.equal(race.config.difficulty, 'hard');
});

test('free driving never awards a race finish when reaching the end of an open track', () => {
  const race = createRace('coast', { mode: 'free' });
  assert.equal(race.rivals.length, 0);
  startRace(race);
  for (let i = 0; i < 181; i++) stepRace(race, {}, 1 / 60);
  assert.equal(race.phase, 'racing');
  race.player.distance = race.length - 0.1;
  race.player.speed = 85;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.phase, 'racing');
  assert.equal(race.result, null);
  assert.ok(race.player.distance <= race.length);
});

test('time attack has no rivals and still completes a normal sprint', () => {
  const race = createRace('coast', { mode: 'time' });
  assert.equal(race.rivals.length, 0);
  startRace(race);
  for (let i = 0; i < 181; i++) stepRace(race, {}, 1 / 60);
  race.player.distance = race.length - 0.1;
  race.player.speed = 80;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.phase, 'finished');
  assert.equal(race.result.position, 1);
});

import { recordModeRace, loadModeHistory, loadHistory, loadUnlocks } from '../src/history.js';

test('practice history stays separate from campaign history and unlocks', () => {
  const map = new Map();
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const race = createRace('coast', { mode: 'time' });
  race.result = { position: 1, time: 40.5, score: 1000 };
  const first = recordModeRace(race, storage);
  assert.deepEqual(first, { best: 40.5, record: true });
  assert.equal(loadModeHistory(storage).length, 1);
  assert.equal(loadHistory(storage).length, 0);
  assert.deepEqual(loadUnlocks(storage), ['coast']);
  race.result.time = 42;
  assert.deepEqual(recordModeRace(race, storage), { best: 40.5, record: false });
  race.result.time = 39;
  assert.deepEqual(recordModeRace(race, storage), { best: 39, record: true });
});

test('invalid and incomplete practice data cannot be saved', () => {
  const race = createRace('coast', { mode: 'free' });
  assert.throws(() => recordModeRace(race), /finished practice/);
  const classic = createRace('coast');
  classic.result = { time: 10, position: 1 };
  assert.throws(() => recordModeRace(classic), /finished practice/);
});

import { loadModeGhost, saveModeGhost } from '../src/history.js';

test('Time Attack ghosts never overwrite Classic ghosts', () => {
  const data = {};
  const storage = { getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = value; } };
  const race = createRace('coast', { mode: 'time' });
  const samples = Array.from({ length: 501 }, (_, k) => [k * 10, 2.5, 0]);
  const run = { time: 50, samples };
  assert.equal(saveModeGhost('coast', race.config, run, storage), true);
  assert.equal(loadModeGhost('coast', race.config, storage).time, 50);
  assert.equal(data['skyline-rush-ghosts'], undefined);
  assert.equal(loadModeGhost('coast', createRace('coast').config, storage), null);
});
