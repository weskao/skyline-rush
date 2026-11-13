import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRace, startRace, stepRace, DRIFT_MIN_SPEED, DRIFT_REWARDS } from '../src/game.js';
import { driftTier } from '../src/drive-rules.ts';

// Design: docs/superpowers/specs/2026-11-13-drift-balance-design.md — every drift pays, spamming does not.
const DT = 1 / 60, WINDOW = 8; // s compared against plain throttle
const DRIFT = { brake: true, steer: 0.1 };
const TIER_TIMES = DRIFT_REWARDS.map(reward => reward.time).sort((a, b) => a - b);

function cruising(speed) {
  const race = createRace(); startRace(race);
  while (race.phase !== 'racing') stepRace(race, {}, DT);
  Object.assign(race, { pickups: [], rings: [], traffic: [], rivals: [] });
  Object.assign(race.player, { speed, x: 0, distance: 1000, nitro: 0, miniBoost: 0, cooldown: 0 });
  return race;
}
/** Metres covered in WINDOW s after drifting `seconds` (then throttle), and the NITRO left unspent. */
function drive(speed, seconds, pressNitro = false) {
  const race = cruising(speed), start = race.player.distance;
  if (pressNitro) race.player.nitro = 1;
  let t = 0;
  for (; t < seconds; t += DT) stepRace(race, DRIFT, DT);
  for (let pressed = false; t < WINDOW; t += DT, pressed = true) stepRace(race, { throttle: true, nitro: pressNitro && !pressed }, DT);
  return { metres: race.player.distance - start, nitro: race.player.nitro };
}

test('driftTier counts the reward thresholds reached', () => {
  assert.deepEqual([0.59, 0.6, 1.2, 5].map(driftTier), [0, 1, 2, 3]);
});

// Every consumer reads driftTier/DRIFT_REWARDS, so a retune is one edit (literal 1/2/3 s once lived in six files).
const TIER_READERS = ['race-hud.ts', 'callouts.ts', 'effects.js', 'audio.js', 'tutorial-cues.ts', 'interactive-tutorial.ts'];
test('drift feedback reads tier thresholds from DRIFT_REWARDS, never literal seconds', () => {
  for (const file of TIER_READERS) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /drift\??\.time\)?\s*>=\s*\d|Math\.floor\([^)]*drift\??\.time/, file);
    assert.match(source, /driftTier\(/, file);
  }
});

test('every drift tier is net positive vs plain throttle from 70 and 88 m/s', () => {
  for (const speed of [70, 88]) {
    const base = drive(speed, 0).metres, perCharge = drive(speed, 0, true).metres - base;
    for (const time of TIER_TIMES) {
      const { metres, nitro } = drive(speed, time + .05);
      const net = metres - base + nitro * perCharge;
      assert.ok(net > 0, `${time} s drift from ${speed} m/s nets ${net.toFixed(1)} m`);
    }
  }
});

// A farmer drifts just past a tier, throttles back to the start speed and repeats; speed never sags below 45 m/s.
function farm(speed, hold) {
  const race = cruising(speed);
  let earned = 0;
  for (let t = 0; t < 60;) {
    for (let held = 0; held < hold && t < 60; held += DT, t += DT) stepRace(race, DRIFT, DT);
    do { stepRace(race, { throttle: true }, DT); t += DT; earned += race.player.nitro; race.player.nitro = 0; } // count uncapped
    while (race.player.speed < speed && t < 60);
  }
  return earned;
}

test('drift-and-recover farming at any tier earns under 60% of pickup income (9 NITRO/min)', () => {
  for (const speed of [70, 88]) for (const time of TIER_TIMES) {
    const earned = farm(speed, time + .05);
    assert.ok(earned < 9, `${time} s holds from ${speed} m/s: ${earned.toFixed(1)} NITRO/min`);
  }
});

test('a first-tier drift at 30 FPS still pays the first tier', () => {
  const race = cruising(80);
  for (let t = 0; t < TIER_TIMES[0] + .05; t += 1 / 30) stepRace(race, DRIFT, 1 / 30);
  stepRace(race, {}, 1 / 30);
  assert.equal(race.player.nitro, DRIFT_REWARDS.at(-1).nitro);
});

test('a drift that slows below DRIFT_MIN_SPEED pays the tier it reached', () => {
  const race = cruising(DRIFT_MIN_SPEED + 1);
  for (let t = 0; t < 1; t += DT) stepRace(race, DRIFT, DT);
  assert.equal(race.player.drift, null);
  assert.equal(race.player.nitro, DRIFT_REWARDS.at(-1).nitro);
});
