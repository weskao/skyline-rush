import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';
import { recordGhost, validGhost, ghostAt } from '../src/ghost.ts';
import { loadGhost, saveGhost, loadModeGhost, saveModeGhost } from '../src/history.js';
import { controlSettings } from '../src/control-settings.ts';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); } };
};
const throwingStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };

function recordedRun(trackId = 'coast') {
  const race = createRace(trackId);
  race.traffic = [];
  race.rivals.forEach(rival => { rival.speed = 0; });
  startRace(race);
  const samples = [];
  while (race.phase !== 'finished') {
    stepRace(race, { throttle: true, steer: race.elapsed % 4 < 2 ? 0.3 : -0.3 }, 1 / 60);
    recordGhost(samples, race);
  }
  return { race, ghost: { time: race.elapsed, samples } };
}

test('a race records x / altitude / distance at 10 Hz of race time, starting after the countdown', () => {
  const race = createRace();
  startRace(race);
  const samples = [];
  for (let i = 0; i < 60 * 4; i++) { stepRace(race, { throttle: true, fly: i > 200 }, 1 / 60); recordGhost(samples, race); }
  assert.equal(race.phase, 'racing');
  assert.equal(samples.length, Math.floor(race.elapsed * 10) + 1);
  const [distance, x, altitude] = samples.at(-1);
  assert.ok(Math.abs(distance - race.player.distance) < 2);
  assert.ok(Math.abs(x - race.player.x) < 0.1);
  assert.ok(altitude >= 0 && Math.abs(altitude - race.player.altitude) < 1);
});

test('a complete run produces a valid ghost whose replay follows the recorded car', () => {
  const { race, ghost } = recordedRun();
  assert.equal(validGhost(ghost, 'coast'), true);
  const halfway = ghostAt(ghost, ghost.time / 2);
  assert.ok(halfway.distance > 1000 && halfway.distance < race.length);
  assert.ok(ghostAt(ghost, 0).distance < 1);
  assert.deepEqual(ghostAt(ghost, ghost.time + 10), ghostAt(ghost, ghost.time + 20)); // holds at the end
  const between = ghostAt(ghost, 1.05);
  const [a, b] = [ghost.samples[10], ghost.samples[11]];
  assert.ok(Math.abs(between.distance - (a[0] + b[0]) / 2) < 1e-6);
  assert.ok(Math.abs(between.x - (a[1] + b[1]) / 2) < 1e-6);
});

test('malformed, mismatched or tampered ghosts are rejected', () => {
  const { ghost } = recordedRun();
  const tamper = change => { const copy = structuredClone(ghost); change(copy); return copy; };
  for (const bad of [null, [], { time: 'fast', samples: ghost.samples }, { time: ghost.time, samples: ghost.samples.slice(0, 20) },
    tamper(g => { g.samples[5] = [1, 2]; }), tamper(g => { g.samples[5][1] = 99; }), tamper(g => { g.samples[5][2] = -1; }),
    tamper(g => { g.samples[30][0] = 0; }), tamper(g => { g.samples[5][0] = NaN; }), tamper(g => { g.samples.at(-1)[0] = 9000; })]) {
    assert.equal(validGhost(bad, 'coast'), false);
  }
  assert.equal(validGhost(ghost, 'nowhere'), false);
  assert.equal(validGhost(ghost, 'neon'), false); // longer than neon's 4 km
});

test('ghosts are stored per track and only valid ones are loaded back', () => {
  const { ghost } = recordedRun();
  const storage = memoryStorage();
  saveGhost('coast', ghost, storage);
  assert.deepEqual(loadGhost('coast', storage), ghost);
  assert.equal(loadGhost('neon', storage), null);
  storage.data['skyline-rush-ghosts'] = JSON.stringify({ coast: { ...ghost, samples: [] } });
  assert.equal(loadGhost('coast', storage), null);
  saveGhost('coast', ghost, throwingStorage);
  assert.equal(loadGhost('coast', throwingStorage), null);
});

test('many mode ghosts stay below a local storage budget while the newest replay survives', () => {
  const { ghost } = recordedRun();
  const storage = memoryStorage();
  for (let i = 0; i < 200; i++) assert.equal(saveModeGhost('coast', { variant: i }, ghost, storage), true);
  assert.ok(storage.data['skyline-rush-mode-ghosts-v1'].length <= 512 * 1024);
  assert.deepEqual(loadModeGhost('coast', { variant: 199 }, storage), ghost);
});

test('the ghost preference defaults off and only accepts booleans', () => {
  assert.equal(controlSettings().ghost, false);
  assert.equal(controlSettings({ version: 1, ghost: true }).ghost, true);
  assert.equal(controlSettings({ version: 1, ghost: 'no' }).ghost, false);
});
