import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace } from '../src/game.js';
import { createCallouts } from '../src/callouts.ts';
import { setLocale } from '../src/i18n.ts';

function preparedRace() {
  const race = createRace();
  race.phase = 'racing';
  race.traffic = [];
  race.rivals = [];
  race.rings = [];
  race.pickups = [];
  race.player.speed = 80;
  return race;
}
function advance(race, seconds, input = {}) {
  for (let n = 0; n < Math.round(seconds * 60); n++) stepRace(race, input, 1 / 60);
}
function land(race) {
  for (let n = 0; n < 420 && !race.player.landing; n++) stepRace(race, { throttle: true }, 1 / 60);
  assert.ok(race.player.landing, 'the car should return to the ground');
}

test('Phase 1: FLY lasts longer without restoring charge while thrusting', () => {
  const race = preparedRace();
  advance(race, 2, { fly: true });
  assert.ok(Math.abs(race.player.fuel - 70) < 0.1, `got ${race.player.fuel}`);
  assert.equal(race.player.thrusting, true);
});

test('Phase 1: AIR DASH stays stronger while allowing a longer combined burst', () => {
  const race = preparedRace();
  advance(race, 2, { fly: true, boost: true });
  assert.ok(Math.abs(race.player.fuel - 64) < 0.1, `got ${race.player.fuel}`);
  assert.equal(race.player.boosting, true);
  assert.equal(race.player.thrusting, true);
});

test('Phase 1: powered airborne NITRO followed by a clean landing extends momentum once', () => {
  const race = preparedRace(), car = race.player;
  car.nitro = 1;
  advance(race, 0.85, { fly: true, nitro: true });
  assert.ok(car.altitude > 0);
  land(race);
  assert.equal(car.landing.chain, true);
  assert.ok(car.miniBoost > 1.1 && car.miniBoost <= 1.2);
  const event = car.landing;
  advance(race, 0.25, { throttle: true });
  assert.equal(car.landing, event, 'one event per landing');
  assert.ok(car.miniBoost < 1.2, 'bridge does not refresh every frame');
});

test('Phase 1: ordinary flight, hard landing and very short flight do not award free momentum', () => {
  const ordinary = preparedRace();
  advance(ordinary, 0.85, { fly: true });
  land(ordinary);
  assert.notEqual(ordinary.player.landing.chain, true);
  assert.equal(ordinary.player.miniBoost, 0);

  const short = preparedRace();
  short.player.nitro = 1;
  advance(short, 0.15, { fly: true, nitro: true });
  land(short);
  assert.notEqual(short.player.landing.chain, true);
  assert.equal(short.player.miniBoost, 0);

  const hard = preparedRace();
  hard.player.nitro = 1;
  advance(hard, 0.85, { fly: true, nitro: true });
  hard.player.altitude = 0.01;
  hard.player.verticalSpeed = -12;
  stepRace(hard, {}, 1 / 60);
  assert.equal(hard.player.altitude, 0);
  assert.notEqual(hard.player.landing.chain, true);
});

test('Phase 1: no-flight daily modifier remains unable to earn an aerial chain', () => {
  const race = preparedRace();
  race.modifier = 'no-flight';
  race.player.nitro = 1;
  advance(race, 1.5, { fly: true, nitro: true });
  assert.equal(race.player.altitude, 0);
  assert.equal(race.player.landing, null);
  assert.equal(race.player.miniBoost, 0);
});

test('Phase 1: earned clean landing receives a single localized UI callout', () => {
  for (const [locale, title] of [['en', 'AIR → ROAD CHAIN'], ['zh-TW', '空地連擊']]) {
    setLocale(locale);
    try {
      const race = preparedRace(), callouts = createCallouts();
      race.player.nitro = 1;
      callouts.update(race);
      advance(race, 0.85, { fly: true, nitro: true });
      // Consume any earlier NITRO activation popup so this assertion checks the landing.
      const active = callouts.update(race);
      assert.equal(active?.title, 'NITRO');
      race.elapsed += 1.3;
      callouts.update(race);
      land(race);
      const result = callouts.update(race);
      assert.equal(result?.title, title);
      assert.ok(result.detail.length > 0);
      race.elapsed += 1.3;
      assert.equal(callouts.update(race), null, 'clean landing must not replay');
    } finally {
      setLocale('en');
    }
  }
});
