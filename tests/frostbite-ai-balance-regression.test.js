import test from 'node:test';
import assert from 'node:assert/strict';
import { FROSTBITE_ID } from '../src/courses/frostbite-race.ts';
import { createRace, stepRace, setLayoutSeed } from '../src/game.js';

// Reproduce full race finishes; resetting layout seeds makes the same track reproducible at each tick rate.
function finish(difficulty, fps, seed, pace) {
  setLayoutSeed(track => track.seed + seed * 7919);
  const race = createRace(FROSTBITE_ID); // Frostbite is Classic-only; vary AI skill without changing its mode.
  race.config = { ...race.config, difficulty };
  if (pace !== undefined) race.rivalPace = pace;
  race.phase = 'racing';
  for (let i = 0; i < 400 * fps && race.phase === 'racing'; i++)
    stepRace(race, { throttle: true }, 1 / fps);
  assert.equal(race.phase, 'finished', `${difficulty} ${fps}Hz seed ${seed}`);
  return race.result;
}

// Mean finish time (s) of the old default, AUTO on with lane centring, on these 4 layouts. A car that never steers now
// drifts wide in corners; the owner's contract (2026-11-22) is that it does no worse than that old default.
const OLD_AUTO_MEAN_TIME = {
  easy: { 30: 194.84, 60: 179.55, 120: 181.95 },
  normal: { 30: 178.87, 60: 180.01, 120: 181.30 },
};

test('a throttle-only Frostbite driver is no slower than the old AUTO default on normal and easy at 30/60/120 Hz', () => {
  try {
    const outcomes = {}, times = {};
    for (const difficulty of ['easy', 'normal', 'hard']) {
      outcomes[difficulty] = {}; times[difficulty] = {};
      for (const fps of [30, 60, 120]) {
        const results = Array.from({ length: 4 }, (_, seed) => finish(difficulty, fps, seed));
        outcomes[difficulty][fps] = results.map(result => result.position);
        times[difficulty][fps] = results.reduce((sum, result) => sum + result.time, 0) / results.length;
      }
    }
    console.log('frostbite-frame-difficulty-baseline', JSON.stringify(outcomes));
    for (const difficulty of ['easy', 'normal'])
      for (const fps of [30, 60, 120]) {
        assert.ok(outcomes[difficulty][fps].every(rank => rank <= 8), `${difficulty} ${fps}Hz: ${outcomes[difficulty][fps]}`);
        assert.ok(times[difficulty][fps] <= OLD_AUTO_MEAN_TIME[difficulty][fps],
          `${difficulty} ${fps}Hz throttle-only mean ${times[difficulty][fps].toFixed(2)} s, old AUTO default ${OLD_AUTO_MEAN_TIME[difficulty][fps]} s`);
      }
    // Easy still lets a throttle-only driver compete for the podium-side half of the grid.
    for (const fps of [30, 60, 120]) assert.ok(outcomes.easy[fps].some(rank => rank <= 6), `easy ${fps}Hz: ${outcomes.easy[fps]}`);
  } finally { setLayoutSeed(); }
});

test('diagnostic: sample Frostbite pace multipliers against the deterministic normal grid', () => {
  try {
    const samples = {};
    for (const pace of [0.96, 0.98, 1, 1.005, 1.01, 1.02, 1.04])
      samples[pace] = Array.from({ length: 6 }, (_, seed) => finish('normal', 60, seed, pace).position);
    console.log('frostbite-pace-calibration', JSON.stringify(samples));
  } finally { setLayoutSeed(); }
});
