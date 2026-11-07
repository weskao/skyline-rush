import test from 'node:test';
import assert from 'node:assert/strict';
import { FROSTBITE_ID } from '../src/courses/frostbite-race.ts';
import { RACE_TRACKS } from '../src/race-tracks.ts';
import { createRace, stepRace, setLayoutSeed } from '../src/game.js';
import { botInput } from '../scripts/pickup-economy.mjs';
import { MAX_SPEED } from '../src/drive-rules.ts';
import { driveRival, rivalSkill, rivalBaseCap } from '../src/rival-driver.ts';

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

test('endurance pace separates grid slots while preserving the player throttle cap', () => {
  const race = createRace(FROSTBITE_ID), skill = rivalSkill(race);
  const slow = race.rivals[0], fast = race.rivals[6];
  race.traffic = [];
  race.rivals = [];
  race.sections = [];
  race.player.distance = -10000;
  for (let i = 0; i < 20 * 60; i++) {
    for (const [rival, slot] of [[slow, 0], [fast, 6]]) {
      rival.fuel = 0;
      rival.boosting = false;
      rival.nitro = 0;
      rival.nitroTime = 0;
      rival.altitude = 0;
      rival.thrusting = false;
      driveRival(race, rival, slot, 0, 1 / 60);
    }
  }
  assert.ok(slow.speed < rivalBaseCap(skill, 0) * race.rivalPace, 'slower slots stay catchable');
  assert.ok(fast.speed > rivalBaseCap(skill, 6) * race.rivalPace, 'front runners remain challenging');
  assert.ok(fast.speed <= MAX_SPEED, 'rivals never exceed the player throttle cap without power-ups');
  for (const id of Object.keys(RACE_TRACKS)) assert.equal(createRace(id).rivalPaceSpread, 0, id);
});

test('Frostbite is the only course with endurance-calibrated rival pace; classics keep theirs', () => {
  for (const id of Object.keys(RACE_TRACKS)) assert.equal(createRace(id).rivalPace, 1, id);
  const pace = createRace(FROSTBITE_ID).rivalPace;
  assert.ok(pace > 0.9 && pace < 1, `Frostbite pace ${pace} must leave the throttle-only driver in the pack`);
});
