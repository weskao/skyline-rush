import test from 'node:test';
import assert from 'node:assert/strict';
import { FROSTBITE_ID } from '../src/courses/frostbite-race.ts';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { createRace, stepRace, setLayoutSeed } from '../src/game.js';
import { botInput } from '../scripts/pickup-economy.mjs';

// 13.8 km is ~2x the longest classic sprint, so at classic rival pace holding the throttle alone won 9 of 24 layouts.
// Frostbite's rivals run a faster pace: throttle-only rarely wins, a driver using the kit (the economy bot) still does.
const SEEDS = 24;
function positions(drive) {
  const out = [];
  try {
    for (let k = 0; k < SEEDS; k++) {
      setLayoutSeed(track => track.seed + k * 7919);
      const race = createRace(FROSTBITE_ID), bot = {};
      race.phase = 'racing';
      for (let i = 0; i < 60 * 400 && race.phase !== 'finished'; i++) stepRace(race, drive === 'bot' ? botInput(race, bot) : { throttle: true }, 1 / 60);
      out.push(race.result.position);
    }
  } finally { setLayoutSeed(); }
  return out;
}

test('throttle-only rarely wins Frostbite Canyon across a deterministic 24-layout sweep', () => {
  const p = positions('throttle'), wins = p.filter(x => x === 1).length;
  assert.ok(wins <= 2, `throttle-only P1 in ${wins}/${SEEDS}: ${p}`);
  assert.ok(p.every(x => x <= 6), `throttle-only stays in the pack: ${p}`);
});

test('a driver using BOOST, NITRO, rings and the span still wins most layouts', () => {
  const p = positions('bot'), wins = p.filter(x => x === 1).length;
  assert.ok(wins >= 20, `bot P1 in ${wins}/${SEEDS}: ${p}`);
});

test('Frostbite is the only course with endurance-calibrated rival pace; classics keep theirs', () => {
  for (const id of Object.keys(RACE_TRACKS)) assert.equal(createRace(id).rivalPace, 1, id);
  const pace = createRace(FROSTBITE_ID).rivalPace;
  assert.ok(pace > 0.9 && pace < 1, `Frostbite pace ${pace} must leave the throttle-only driver in the pack`);
});
