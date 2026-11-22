import test from 'node:test';
import assert from 'node:assert/strict';
import { FROSTBITE_ID } from '../src/courses/frostbite-race.ts';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { createRace, stepRace, setLayoutSeed } from '../src/game.js';
import { botInput } from '../scripts/pickup-economy.mjs';
import { MAX_SPEED, BOOST_CAP_BONUS } from '../src/drive-rules.ts';
import { rivalBaseCap, rivalSkill, RIVAL_SKILL } from '../src/rival-driver.ts';

// 13.8 km is ~2x the longest classic sprint, so at classic rival pace holding the throttle alone won 9 of 24 layouts.
// Frostbite's rivals run a faster pace: throttle-only rarely wins, a driver using the kit (the economy bot) still does.
const SEEDS = 24;
// Corners push a car that never steers outward, so it brushes more traffic. The owner's contract (2026-11-22): it must do
// no worse than the old default, AUTO on with lane centring, which averaged 186.6 s here (P7-8) over the same 24 layouts.
const OLD_AUTO_MEAN_TIME = 186.6;
function results(drive) {
  const out = [];
  try {
    for (let k = 0; k < SEEDS; k++) {
      setLayoutSeed(track => track.seed + k * 7919);
      const race = createRace(FROSTBITE_ID), bot = {};
      race.phase = 'racing';
      for (let i = 0; i < 60 * 400 && race.phase !== 'finished'; i++) stepRace(race, drive === 'bot' ? botInput(race, bot) : { throttle: true }, 1 / 60);
      out.push(race.result);
    }
  } finally { setLayoutSeed(); }
  return out;
}
const positions = drive => results(drive).map(result => result.position);

test('throttle-only rarely wins Frostbite Canyon and is no slower than the old AUTO default', () => {
  const r = results('throttle'), p = r.map(result => result.position), wins = p.filter(x => x === 1).length;
  const meanTime = r.reduce((sum, result) => sum + result.time, 0) / SEEDS;
  assert.ok(wins <= 2, `throttle-only P1 in ${wins}/${SEEDS}: ${p}`);
  assert.ok(p.every(x => x <= 8), `throttle-only finishes classified: ${p}`);
  assert.ok(meanTime <= OLD_AUTO_MEAN_TIME, `throttle-only mean ${meanTime.toFixed(2)} s, old AUTO default ${OLD_AUTO_MEAN_TIME} s`);
});

test('a driver using BOOST, NITRO, rings and the span still wins most layouts', () => {
  const p = positions('bot'), wins = p.filter(x => x === 1).length;
  assert.ok(wins >= 20, `bot P1 in ${wins}/${SEEDS}: ${p}`);
});

test('the faster rival pace is Frostbite-only: every other track keeps the classic pace', () => {
  for (const id of Object.keys(RACE_TRACKS)) assert.equal(createRace(id).rivalPace, 1, id);
  assert.ok(createRace(FROSTBITE_ID).rivalPace > 1);
});

test('Frostbite-specific grid spread protects the slowest slots without slowing the fastest or classic tracks', () => {
  const frostbite = createRace(FROSTBITE_ID);
  assert.ok(frostbite.rivalSpread > RIVAL_SKILL.normal.spread);
  assert.ok(rivalBaseCap(RIVAL_SKILL.normal, 0, frostbite.rivalSpread) < rivalBaseCap(RIVAL_SKILL.normal, 0));
  assert.equal(rivalBaseCap(RIVAL_SKILL.normal, 6, frostbite.rivalSpread), rivalBaseCap(RIVAL_SKILL.normal, 6));
  for (const id of Object.keys(RACE_TRACKS)) assert.equal(createRace(id).rivalSpread, undefined, id);
});

// A longer track should still have a mid-pack throttle-only experience: even at full fuel,
// the slower two Normal rivals must not automatically outrun the player's unboosted cap.
test('Frostbite has two genuinely slower Normal rivals even at the BOOST cap', () => {
  const race = createRace(FROSTBITE_ID), skill = rivalSkill(race);
  for (let slot = 0; slot < 2; slot++) {
    const boostedCap = Math.min(MAX_SPEED, rivalBaseCap(skill, slot, race.rivalSpread) * race.rivalPace) + BOOST_CAP_BONUS;
    assert.ok(boostedCap <= MAX_SPEED, `slot ${slot} has full-BOOST cap ${boostedCap}, above the throttle-only player`);
  }
});

test('Frostbite tuning preserves classic track rival difficulty curves', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const legacy = createRace('aurora', { mode: 'custom', difficulty });
    assert.equal(rivalSkill(legacy).spread, { easy: 0.012, normal: 0.006, hard: 0.003 }[difficulty], difficulty);
  }
});
