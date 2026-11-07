import test from 'node:test';
import assert from 'node:assert/strict';
import { FROSTBITE_ID } from '../src/courses/frostbite-race.ts';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { createRace, stepRace, setLayoutSeed } from '../src/game.js';
import { botInput } from '../scripts/pickup-economy.mjs';
import { rivalBaseCap, rivalSkill, RIVAL_SKILL } from '../src/rival-driver.ts';
import { MAX_SPEED, BOOST_CAP_BONUS } from '../src/drive-rules.ts';

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

test('Frostbite Normal keeps the fastest rival competitive and gives a throttle driver two slower rivals', () => {
  const normal = rivalSkill(createRace('aurora')), frostbite = rivalSkill(createRace(FROSTBITE_ID));
  assert.equal(normal, RIVAL_SKILL.normal, 'other tracks retain their original skill');
  assert.equal(rivalBaseCap(frostbite, 6), rivalBaseCap(normal, 6), 'fastest rival keeps its original cap');
  assert.ok(rivalBaseCap(frostbite, 1) + BOOST_CAP_BONUS <= MAX_SPEED,
    'two slower rivals stay within throttle-only speed even while using BOOST');
});

test('throttle-only rarely wins Frostbite Canyon across a deterministic 24-layout sweep', () => {
  const p = positions('throttle'), wins = p.filter(x => x === 1).length;
  assert.ok(wins <= 2, `throttle-only P1 in ${wins}/${SEEDS}: ${p}`);
  assert.ok(p.every(x => x <= 6), `throttle-only stays in the pack: ${p}`);
});

test('a driver using BOOST, NITRO, rings and the span still wins most layouts', () => {
  const p = positions('bot'), wins = p.filter(x => x === 1).length;
  assert.ok(wins >= 20, `bot P1 in ${wins}/${SEEDS}: ${p}`);
});

test('the faster rival pace is Frostbite-only: every other track keeps the classic pace', () => {
  for (const id of Object.keys(RACE_TRACKS)) assert.equal(createRace(id).rivalPace, 1, id);
  assert.ok(createRace(FROSTBITE_ID).rivalPace > 1);
});
