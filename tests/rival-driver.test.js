import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, MAX_SPEED, RIVAL_NITRO_CHARGES, SLIPSTREAM_TIME, SLIPSTREAM_NITRO } from '../src/game.js';
import { driveRival, rivalBaseCap, rivalSkill, RIVAL_SKILL } from '../src/rival-driver.ts';
import { BOOST_CAP_BONUS, NITRO_CAP_BONUS, SLIPSTREAM_CAP_BONUS, BOOST_DRAIN } from '../src/drive-rules.ts';
import { avoidObstacles } from '../src/car-collisions.js';
import { botInput } from '../scripts/pickup-economy.mjs';

// User, 2026-11-07: rivals race by the player's rules (no NITRO at the start, the player's top speed, the same
// NITRO / BOOST / SLIPSTREAM numbers and fuel); difficulty only changes how well they drive.
const DIFFICULTIES = ['easy', 'normal', 'hard'];
function bare(difficulty) {
  const race = createRace('aurora', { mode: 'custom', rivals: 7, difficulty, traffic: 'off' });
  startRace(race); race.phase = 'racing'; race.elapsed = 20;
  Object.assign(race, { rings: [], pickups: [], props: [] });
  Object.assign(race.player, { distance: 0, x: 7.5 });
  race.rivals.forEach((r, i) => Object.assign(r, { distance: 2000 + i * 400, x: -2.5, altitude: 0, thrusting: false }));
  return race;
}
const run = (race, rival, slot, seconds) => { for (let i = 0; i < seconds * 60; i++) driveRival(race, rival, slot, 0, 1 / 60); };

test('rivals start like the player: no NITRO, a full tank', () => {
  assert.equal(RIVAL_NITRO_CHARGES, 0);
  for (const difficulty of DIFFICULTIES) {
    const race = createRace('coast', { mode: 'custom', rivals: 7, difficulty });
    assert.ok(race.rivals.every(r => r.nitro === 0 && r.fuel === 100 && r.nitroTime === 0), difficulty);
  }
});

test('no difficulty lifts a rival past the player\'s top speed; BOOST and NITRO add the player\'s bonuses', () => {
  for (const difficulty of DIFFICULTIES) {
    for (let slot = 0; slot < 7; slot++) assert.ok(rivalBaseCap(RIVAL_SKILL[difficulty], slot) <= MAX_SPEED, `${difficulty} ${slot}`);
    const race = bare(difficulty), rival = race.rivals[6];
    rival.speed = 0;
    for (let i = 0; i < 12 * 60; i++) { rival.fuel = 0; driveRival(race, rival, 6, 0, 1 / 60); } // the throttle alone
    assert.equal(rival.speed, rivalBaseCap(RIVAL_SKILL[difficulty], 6), difficulty);
  }
  const hard = bare('hard'), rival = hard.rivals[6];
  Object.assign(rival, { speed: MAX_SPEED, fuel: 100 });
  run(hard, rival, 6, 2);
  assert.ok(rival.boosting && rival.speed > MAX_SPEED && rival.speed <= MAX_SPEED + BOOST_CAP_BONUS, `boost ${rival.speed}`);
  Object.assign(rival, { nitro: 1, fuel: 0, boosting: false });
  run(hard, rival, 6, 2);
  assert.equal(rival.nitro, 0, 'a clear lane: Hard fires its charge');
  assert.ok(rival.speed > MAX_SPEED + BOOST_CAP_BONUS && rival.speed <= MAX_SPEED + NITRO_CAP_BONUS, `nitro ${rival.speed}`);
});

test('BOOST burns the player\'s fuel and stops on an empty tank', () => {
  const race = bare('normal'), rival = race.rivals[6];
  Object.assign(rival, { speed: MAX_SPEED, fuel: 60 });
  run(race, rival, 6, 1);
  assert.ok(rival.boosting);
  assert.ok(Math.abs(rival.fuel - (60 - BOOST_DRAIN)) < 1e-6, `fuel ${rival.fuel}`);
  Object.assign(rival, { fuel: 0, boosting: false });
  run(race, rival, 6, 1 / 60);
  assert.equal(rival.boosting, false);
  const easy = bare('easy'), slow = easy.rivals[6];
  Object.assign(slow, { speed: 70, fuel: 70 }); // Easy saves fuel: it only boosts from a fuller tank
  run(easy, slow, 6, 1 / 60);
  assert.equal(slow.boosting, false);
});

test('Normal and Hard never fire NITRO into a car on their line; Easy keeps its personality timing', () => {
  for (const difficulty of ['normal', 'hard']) {
    const race = bare(difficulty), rival = race.rivals[6];
    Object.assign(rival, { speed: 80, nitro: 1 });
    race.traffic = [{ distance: rival.distance + 40, x: rival.x, altitude: 0, speed: 30 }];
    run(race, rival, 6, 1 / 60);
    assert.equal(rival.nitro, 1, `${difficulty}: held behind a car`);
    race.traffic[0].x = 7.5;
    run(race, rival, 6, 1 / 60);
    assert.equal(rival.nitro, 0, `${difficulty}: fired once clear`);
  }
  const easy = bare('easy'), nova = easy.rivals[0];
  Object.assign(nova, { nitro: 1, nitroUses: 0 });
  easy.elapsed = 5; // NOVA's first moment is 8 s
  run(easy, nova, 0, 1 / 60);
  assert.equal(nova.nitro, 1, 'Easy waits for its moment');
  easy.elapsed = 8;
  run(easy, nova, 0, 1 / 60);
  assert.equal(nova.nitro, 0);
});

test('a rival in a car\'s draft gets the player\'s SLIPSTREAM: the cap bonus and one NITRO payout', () => {
  const race = bare('hard'), rival = race.rivals[6];
  Object.assign(rival, { speed: MAX_SPEED, fuel: 0 });
  const lead = { distance: rival.distance + 8, x: rival.x, altitude: 0, speed: MAX_SPEED };
  race.traffic = [lead];
  for (let i = 0; i < (SLIPSTREAM_TIME + 0.5) * 60; i++) { driveRival(race, rival, 6, 0, 1 / 60); lead.distance = rival.distance + 8; }
  assert.ok(rival.slipstream.active);
  assert.ok(Math.abs(rival.nitro - SLIPSTREAM_NITRO) < 1e-9, `nitro ${rival.nitro}`);
  assert.ok(rival.speed > MAX_SPEED && rival.speed <= MAX_SPEED + SLIPSTREAM_CAP_BONUS, `speed ${rival.speed}`);
});

test('in a real race no rival ever runs faster than the player\'s NITRO + SLIPSTREAM cap', () => {
  const race = createRace('coast', { mode: 'custom', rivals: 7, difficulty: 'hard' });
  startRace(race); race.phase = 'racing';
  const bot = { boost: false, climb: false };
  for (let i = 0; i < 60 * 40 && race.phase === 'racing'; i++) {
    stepRace(race, botInput(race, bot), 1 / 60);
    for (const r of race.rivals) assert.ok(r.pace <= MAX_SPEED + NITRO_CAP_BONUS + SLIPSTREAM_CAP_BONUS + 1e-9, `${r.name} ${r.pace}`);
  }
});

test('a fast rival sees a slow car beyond the old 80 m and changes lane in time', () => {
  const race = bare('hard'), rival = race.rivals[6];
  Object.assign(rival, { x: -2.5, homeX: -2.5, pace: MAX_SPEED + NITRO_CAP_BONUS });
  race.traffic = [{ distance: rival.distance + 120, x: -2.5, altitude: 0, speed: 25 }];
  const x = rival.x;
  avoidObstacles(race, rival, rival.pace, 1 / 60);
  assert.notEqual(rival.x, x, 'starts moving 120 m out at NITRO speed');
});

// User, 2026-11-07: Normal felt too hard, and on the first two maps a new player should mostly finish top three.
// Coast and Neon (TrackConfig.introRivals) give Easy and Normal rivals the gentler 'intro' skill; Hard keeps its own.
test('on an opening map Easy and Normal rivals drive at intro skill: slower and no BOOST; Hard is unchanged', () => {
  const intro = RIVAL_SKILL.intro;
  for (let slot = 0; slot < 7; slot++) {
    assert.ok(rivalBaseCap(intro, slot) < rivalBaseCap(RIVAL_SKILL.easy, slot), `intro below Easy elsewhere, slot ${slot}`);
  }
  for (const trackId of ['coast', 'neon']) {
    for (const difficulty of ['easy', 'normal']) {
      const race = createRace(trackId, { mode: 'custom', rivals: 7, difficulty });
      assert.equal(rivalSkill(race), intro, `${trackId} ${difficulty}`);
      const rival = race.rivals[6];
      Object.assign(rival, { speed: 80, fuel: 100, distance: 2000, x: -2.5 });
      race.phase = 'racing';
      for (let i = 0; i < 60; i++) driveRival(race, rival, 6, 0, 1 / 60);
      assert.equal(rival.boosting, false, `${trackId} ${difficulty}: no BOOST on a full tank`);
    }
    assert.equal(rivalSkill(createRace(trackId, { mode: 'custom', rivals: 7, difficulty: 'hard' })), RIVAL_SKILL.hard);
  }
  assert.equal(rivalSkill(createRace('canyon', { mode: 'classic' })), RIVAL_SKILL.normal, 'the third map is plain Normal');
});

test('long-course rivalPace preserves difficulty scaling without raising unboosted rivals above player cap', () => {
  const race = bare('easy'), rival = race.rivals[6];
  Object.assign(rival, { speed: 0, fuel: 0, boosting: false });
  race.rivalPace = 1.3;
  for (let i = 0; i < 20 * 60; i++) { rival.fuel = 0; driveRival(race, rival, 6, 0, 1 / 60); } // truly unboosted despite fuel regeneration
  assert.equal(rival.speed, MAX_SPEED, 'fast courses still respect the player throttle cap');
  Object.assign(rival, { speed: 0, fuel: 0, boosting: false });
  race.rivalPace = 0.5;
  for (let i = 0; i < 20 * 60; i++) { rival.fuel = 0; driveRival(race, rival, 6, 0, 1 / 60); } // truly unboosted despite fuel regeneration
  assert.equal(rival.speed, rivalBaseCap(RIVAL_SKILL.easy, 6) * 0.5, 'slower courses retain their pace multiplier');
});

test('Frostbite long-course pace retains slower backmarkers while the fastest rival reaches the player throttle cap', () => {
  const race = createRace('frostbite-canyon');
  const caps = race.rivals.map((rival, slot) => {
    Object.assign(rival, { distance: 2000 + slot * 500, x: -2.5, speed: 0, nitro: 0, nitroTime: 0, boosting: false });
    // No BOOST or NITRO: ground fuel naturally regenerates, so drain it before each step.
    for (let i = 0; i < 20 * 60; i++) {
      rival.fuel = 0;
      driveRival(race, rival, slot, 0, 1 / 60);
    }
    return rival.speed;
  });
  assert.ok(caps[0] <= MAX_SPEED - 10, `Frostbite backmarker stays catchable: ${caps}`);
  assert.ok(caps[1] <= MAX_SPEED - 8, `Frostbite second backmarker stays catchable: ${caps}`);
  assert.equal(caps[6], MAX_SPEED, 'the fastest rival remains competitive at the normal throttle cap');
  assert.ok(caps.every((speed, slot) => slot === 0 || speed >= caps[slot - 1]), `ordered grid: ${caps}`);
  assert.equal(createRace('aurora').rivalSpread, undefined, 'classic tracks retain their original skill spread');
});
