import test from 'node:test';
import assert from 'node:assert/strict';
import { FROSTBITE_ID } from '../src/courses/frostbite-race.ts';
import { createRace, stepRace, setLayoutSeed } from '../src/game.js';

// Reproduce full race finishes; resetting layout seeds makes the same track reproducible at each tick rate.
function finish(difficulty, fps, seed, pace) {
  setLayoutSeed(track => track.seed + seed * 7919);
  const race = createRace(FROSTBITE_ID, { mode: 'custom', rivals: 7, difficulty });
  if (pace !== undefined) race.rivalPace = pace;
  race.phase = 'racing';
  for (let i = 0; i < 400 * fps && race.phase === 'racing'; i++)
    stepRace(race, { throttle: true }, 1 / fps);
  assert.equal(race.phase, 'finished', `${difficulty} ${fps}Hz seed ${seed}`);
  return race.result.position;
}

test('a throttle-only Frostbite driver does not finish universally last on normal and easy at 30/60/120 Hz', () => {
  try {
    const outcomes = {};
    for (const difficulty of ['easy', 'normal', 'hard']) {
      outcomes[difficulty] = {};
      for (const fps of [30, 60, 120])
        outcomes[difficulty][fps] = Array.from({ length: 4 }, (_, seed) => finish(difficulty, fps, seed));
    }
    console.log('frostbite-frame-difficulty-baseline', JSON.stringify(outcomes));
    for (const difficulty of ['easy', 'normal'])
      for (const fps of [30, 60, 120])
        assert.ok(outcomes[difficulty][fps].some(rank => rank <= 6),
          `${difficulty} ${fps}Hz throttle-only should compete, not universally finish last: ${outcomes[difficulty][fps]}`);
  } finally { setLayoutSeed(); }
});

test('diagnostic: sample Frostbite pace multipliers against the deterministic normal grid', () => {
  try {
    const samples = {};
    for (const pace of [0.96, 0.98, 1, 1.005, 1.01, 1.02, 1.04])
      samples[pace] = Array.from({ length: 6 }, (_, seed) => finish('normal', 60, seed, pace));
    console.log('frostbite-pace-calibration', JSON.stringify(samples));
  } finally { setLayoutSeed(); }
});
