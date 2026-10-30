import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, validateRaceRequest } from '../src/race-config.ts';
import { createRace, stepRace } from '../src/game.js';
import { recordModeRace, loadModeBest, loadModeHistory } from '../src/history.ts';
import { mergeModeBests } from '../src/cloud-mode-bests.ts';
import { mergeProgress } from '../src/cloud-progress-merge.ts';
import { settleRace } from '../src/race-results.ts';
import { loadSessionProgress } from '../src/session-progress.ts';
import { createGhostStore } from '../src/ghost-store.ts';
import { streamEndless } from '../src/endless-highway.ts';

function endless() {
  assert.ok(MODES.includes('endless'), 'Distance Survival must be an explicit selectable mode');
  const race = createRace('coast', { mode: 'endless' });
  race.phase = 'racing';
  return race;
}
const memory = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
function visit(race, distance) {
  Object.assign(race.player, { distance, speed: 70, x: 0, altitude: 0, cooldown: 1 });
  stepRace(race, { throttle: true }, 1 / 60);
}

test('Endless explicitly restricts v1 to Coast and continues beyond all authored finishes', () => {
  const race = endless();
  assert.equal(validateRaceRequest({ mode: 'endless' }).rivals, 0);
  for(const id of ['neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic'])
    assert.equal(createRace(id,{mode:'endless'}).trackId,id);
  assert.equal(race.objective.type, 'distance-survival');
  for (const distance of [4999, 8001, 20000, 1_000_000_000]) {
    visit(race, distance);
    assert.equal(race.phase, 'racing');
    assert.equal(race.result, null);
    assert.ok(race.player.distance > distance, 'absolute progress must never wrap or clamp');
    assert.ok(Number.isFinite(race.length), 'no Infinity length workaround');
  }
});

test('chunk encounters regenerate from absolute seeds and retain consumed rewards until they expire', () => {
  const race = endless();
  visit(race, 9040);
  const reward = race.pickups.find(item => item.distance > race.player.distance);
  reward.taken = true;
  const same = JSON.stringify(race.pickups);
  visit(race, 9042);
  assert.equal(JSON.stringify(race.pickups), same);
  const expected = race.pickups.map(({ taken, ...item }) => item);
  const fresh = endless(); visit(fresh, 9040);
  assert.deepEqual(fresh.pickups.map(({ taken, ...item }) => item), expected);
  const earlier = JSON.stringify(fresh.pickups.map(item => [item.x, item.altitude, item.tier]));
  visit(fresh, 18040);
  assert.notEqual(JSON.stringify(fresh.pickups.map(item => [item.x, item.altitude, item.tier])), earlier);
});

test('encounter arrays and group bookkeeping stay bounded across long sessions and restart independently', () => {
  const race = endless();
  for (let distance = 0; distance <= 2_000_000; distance += 997) {
    visit(race, distance);
    assert.ok(race.traffic.length <= 40);
    assert.ok(race.pickups.length <= 20);
    assert.ok(race.rings.length <= 15);
    assert.ok(Object.keys(race.player.groupHits).length <= 5);
    assert.ok(race.pickups.every(item => Math.abs(item.distance - distance) < 2500));
  }
  const before = JSON.stringify(race);
  race.phase = 'paused'; const paused = JSON.stringify(race);
  stepRace(race, { throttle: true }, 1);
  assert.equal(JSON.stringify(race), paused);
  race.phase = 'racing';
  visit(race, 2_000_001);
  const restart = endless();
  assert.equal(restart.player.distance, 0);
  assert.equal(restart.endless.milestones, 0);
  assert.notEqual(JSON.stringify(restart), before);
  const classic = createRace('coast');
  assert.equal(classic.endless, undefined);
  assert.equal(classic.traffic.length, 36);
});

test('streaming preserves nearby moving traffic after its spawn chunk expires', () => {
  const race = endless();
  for (let second = 0; second < 1200; second++) {
    race.player.distance += 50;
    for (const car of race.traffic) car.distance += car.speed;
    const visible = race.traffic.filter(car => car.distance >= race.player.distance - 60 && car.distance <= race.player.distance + 1400);
    streamEndless(race);
    for (const car of visible) assert.ok(race.traffic.includes(car), 'a visible traffic car must not disappear at a chunk boundary');
    assert.ok(race.traffic.length <= 40, 'keeping moving cars must preserve the fixed traffic budget');
  }
});

test('the fifth real collision settles final absolute distance without campaign or Ghost writes', () => {
  const race = endless(); visit(race, 120_000);
  Object.assign(race.player, { collisions: 4, cooldown: 0, x: 10.1, speed: 80, steering: 1 });
  stepRace(race, { throttle: true, steer: 1 }, .1);
  assert.equal(race.phase, 'finished');
  assert.equal(race.result.collisions, 5);
  assert.ok(race.result.distance >= 120_000);
  assert.equal(race.result.endReason, 'collisions');
  const storage = memory(); globalThis.localStorage = storage;
  try {
    const progress = loadSessionProgress(['coast']);
    const settled = settleRace(race, { series: { sprintSeries: null, cup: null, stunt: null }, progress,
      ghosts: createGhostStore(), daily: null, trace: [] });
    assert.equal(settled.best, race.result.distance);
    assert.equal(progress.modeHistory[0].distance, race.result.distance);
    assert.deepEqual(progress.history, []);
    assert.deepEqual([...progress.unlocked], ['coast']);
    assert.deepEqual(progress.bests, {});
    assert.deepEqual(settled.medals, []);
  } finally { delete globalThis.localStorage; }
});

test('longest distance survives rolling history and cloud merges preserve long-run telemetry', () => {
  const store = memory(), race = endless();
  const finish = distance => { race.result = { time: distance / 80, distance, success: true, position: 1, score: 0 }; return race; };
  assert.deepEqual(recordModeRace(finish(2_000_000), store), { best: 2_000_000, record: true });
  for (let i = 0; i < 55; i++) recordModeRace(finish(120_000 + i), store);
  assert.equal(loadModeBest('coast', race.config, store), 2_000_000);
  assert.equal(loadModeHistory(store).length, 50);
  const key = JSON.stringify(['coast', race.config]);
  const merged = mergeModeBests({ bests: { [key]: 2_000_000 } }, { version: 1, bests: { [key]: 3_000_000 } });
  assert.equal(merged.bests[key], 3_000_000);
  const progress = mergeProgress({ modeHistory: loadModeHistory(store) }, null);
  assert.equal(progress.modeHistory.length, 50);
  assert.ok(progress.modeHistory.every(run => run.distance > 100_000));
});
