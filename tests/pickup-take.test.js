import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { takePickups, MAGNET_RANGE } from '../src/pickup-take.ts';
import { MAGNET_RANGE as GAME_MAGNET_RANGE, createRace, startRace, stepRace, NITRO_FUEL_BONUS } from '../src/game.js';
import { PICKUP_HAPTIC_MS, PICKUP_KICK_SHARE } from '../src/pickup-feedback.ts';

const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');

test('the player pickup take lives in its own module, not in game.js', () => {
  assert.equal(typeof takePickups, 'function');
  assert.equal(GAME_MAGNET_RANGE, MAGNET_RANGE, 'game.js re-exports the one magnet range');
  assert.doesNotMatch(game, /for \(const pickup of race\.pickups\)/);
  assert.match(game, /takePickups\(race, car, previousDistance, addNitro\)/);
});

const racing = () => {
  const race = createRace();
  startRace(race);
  for (let t = 0; t < 3.1; t += 1 / 60) stepRace(race, {}, 1 / 60);
  Object.assign(race, { traffic: [], pickups: [], rings: [] });
  race.player.speed = 60;
  return race;
};
const takeAhead = (race, tier) => {
  race.pickups = [{ distance: race.player.distance + 0.5, x: race.player.x, altitude: 0, tier }];
  stepRace(race, {}, 1 / 60);
};

test('a player take records its tier, time and the fuel it actually added', () => {
  const race = racing();
  race.player.fuel = 50;
  assert.equal(race.player.pickup ?? null, null);
  takeAhead(race, 'can');
  const first = race.player.pickup;
  assert.deepEqual(first, { tier: 'can', fuel: 0.5 * NITRO_FUEL_BONUS, time: race.elapsed });
  race.player.fuel = 99;
  takeAhead(race, 'tank');
  assert.notEqual(race.player.pickup, first, 'every take is a new event');
  assert.equal(race.player.pickup.tier, 'tank');
  assert.ok(race.player.pickup.fuel > 0 && race.player.pickup.fuel <= 1 + 1e-9, 'only the fuel that fit under 100');
  assert.equal(createRace().player.pickup, null);
});

test('pickup feedback keeps the tier order: cell < can < tank < overcharge, with a light can pulse', () => {
  const order = ['cell', 'can', 'tank', 'overcharge'];
  for (const table of [PICKUP_HAPTIC_MS, PICKUP_KICK_SHARE]) {
    for (let i = 1; i < order.length; i++) assert.ok(table[order[i]] > table[order[i - 1]], `${order[i]} > ${order[i - 1]}`);
  }
  assert.ok(PICKUP_HAPTIC_MS.can >= 8 && PICKUP_HAPTIC_MS.can <= 10);
  assert.ok(Object.values(PICKUP_HAPTIC_MS).every(Number.isInteger), 'single pulses: iOS plays one tick each');
  assert.equal(PICKUP_KICK_SHARE.can, 0.2);
});
