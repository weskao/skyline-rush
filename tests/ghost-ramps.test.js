import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace } from '../src/game.js';
import { recordGhost, ghostAt, validGhost, GHOST_RATE } from '../src/ghost.ts';
import { createGhostStore } from '../src/ghost-store.ts';
import { SIM_STEP } from '../src/frame-pacing.ts';
import { compileCourse, validateCourse } from '../src/event-lab.ts';

// 9K: a Ghost recorded over launch ramps replays the same airborne arc it flew.
const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
beforeEach(() => { globalThis.localStorage = memory(); });
afterEach(() => { delete globalThis.localStorage; });

const canyonConfig = { mode: 'custom', rivals: 0, traffic: 'off', themes: true };
const canyon = () => createRace('canyon', canyonConfig);
const access = new Set(['coast']);
const eventLab = () => compileCourse(createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off' }), validateCourse({
  version: 1, label: 'Jumps', trackId: 'coast', seed: 7, modifier: 'standard',
  objects: [{ kind: 'ramp', distance: 600, lane: 1 }, { kind: 'ramp', distance: 1400, lane: 2 }, { kind: 'ramp', distance: 3400, lane: 0 }],
}, access), access);

// The main.js loop: fixed 60 Hz physics with recordGhost after every step; the driver lines up on each ramp.
function drive(race) {
  const samples = [], truth = [];
  startRace(race);
  for (let frame = 0; race.phase !== 'finished' && frame < 60 * 400; frame++) {
    const ramp = race.ramps.find(r => r.distance - race.player.distance > 0 && r.distance - race.player.distance < 60);
    if (ramp && race.player.altitude === 0) race.player.x = ramp.x;
    stepRace(race, { throttle: true }, SIM_STEP);
    recordGhost(samples, race);
    if (race.phase === 'racing') truth.push([race.elapsed, race.player.distance, race.player.x, race.player.altitude]);
  }
  assert.equal(race.phase, 'finished');
  return { race, ghost: { time: race.elapsed, samples }, truth };
}

// The car's true pose at race time t, linear between physics steps.
function truthAt(truth, t) {
  const i = Math.max(1, truth.findIndex(s => s[0] >= t));
  const [t0, d0, x0, a0] = truth[i - 1], [t1, d1, x1, a1] = truth[i], k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return { distance: d0 + (d1 - d0) * k, x: x0 + (x1 - x0) * k, altitude: a0 + (a1 - a0) * k };
}
// Airborne arcs as [takeoff, landing] race times.
function arcs(truth) {
  const out = [];
  for (let i = 1; i < truth.length; i++) {
    if (truth[i - 1][3] === 0 && truth[i][3] > 0) out.push([truth[i - 1][0], null]);
    if (truth[i - 1][3] > 0 && truth[i][3] === 0 && out.length) out.at(-1)[1] = truth[i][0];
  }
  return out.filter(([, end]) => end !== null);
}

for (const [name, build] of [['Canyon themed ramps', canyon], ['an Event Lab ramp course', eventLab]]) {
  test(`a Ghost recorded over ${name} replays the airborne arc at 30/60/120 Hz`, () => {
    const { race, ghost, truth } = drive(build());
    assert.ok(validGhost(ghost, race.trackId, race.config), 'the run stays a valid Ghost');
    const jumps = arcs(truth);
    assert.ok(jumps.length >= 3, `${jumps.length} ramp jumps`);
    for (const hz of [30, 60, 120]) for (const [takeoff, landing] of jumps) {
      for (let t = Math.ceil(takeoff * hz) / hz; t <= landing; t += 1 / hz) {
        const replay = ghostAt(ghost, t), real = truthAt(truth, t), at = `${hz} Hz @${t.toFixed(2)} s`;
        assert.ok(Math.abs(replay.distance - real.distance) <= 0.02 && Math.abs(replay.x - real.x) <= 0.02, `${at}: off the line`);
        assert.ok(replay.altitude >= 0 && (real.altitude < 0.4 || replay.altitude > 0), `${at}: ghost ${replay.altitude} in the road, car at ${real.altitude}`);
        // Between two airborne samples the arc is a parabola (7 m/s² glide): a 10 Hz chord is within g·Δt²/8 ≈ 1 cm.
        const low = Math.floor(t * GHOST_RATE), inAir = ghost.samples[low][2] > 0 && ghost.samples[low + 1]?.[2] > 0;
        if (inAir) assert.ok(Math.abs(replay.altitude - real.altitude) <= 0.02, `${at}: arc off by ${replay.altitude - real.altitude} m`);
        // shortcut: at takeoff/touchdown the 10 Hz chord floats over the corner by ≤ |vz|·Δt/4; a denser rate would need a Ghost format bump.
        else assert.ok(Math.abs(replay.altitude - real.altitude) <= 0.4, `${at}: corner off by ${replay.altitude - real.altitude} m`);
      }
      // The replay touches down where the car did, and is back on the road within one sample.
      const touchdown = ghostAt(ghost, landing), real = truthAt(truth, landing);
      assert.ok(Math.abs(touchdown.distance - real.distance) <= 0.02 && touchdown.altitude <= 0.4, `${hz} Hz: lands at ${touchdown.distance} vs ${real.distance} m`);
      assert.equal(ghostAt(ghost, landing + 1 / GHOST_RATE).altitude, 0, `${hz} Hz: still airborne a sample after landing`);
    }
  });
}

test('the Canyon themed ramp Ghost is kept under its own ruleset, and an Event Lab run never enters Custom history', () => {
  const store = createGhostStore();
  const themed = drive(canyon());
  assert.equal(store.saveCustom(themed.race, themed.ghost), true);
  const fresh = createGhostStore();
  assert.deepEqual(fresh.mode(canyon()), themed.ghost, 'reloads intact and valid');
  assert.equal(fresh.classic('canyon'), null);
  assert.equal(fresh.mode(createRace('canyon', { ...canyonConfig, themes: false })), null, 'plain Custom Canyon keeps its own Ghost');
  assert.equal(fresh.mode(createRace('canyon', { mode: 'time' })), null);
  const lab = drive(eventLab());
  assert.equal(validGhost(lab.ghost, 'coast', lab.race.config), true);
  assert.equal(store.saveCustom(lab.race, lab.ghost), false, 'Event Lab runs are not Custom heats');
  assert.equal(createGhostStore().mode(createRace('coast', { mode: 'custom', rivals: 0, traffic: 'off' })), null);
});
