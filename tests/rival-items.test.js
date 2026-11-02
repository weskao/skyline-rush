import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rivalWantsNitro, rivalCollects, RIVAL_NITRO_CHARGES, ITEM_RESPAWN, EASY_RIVAL_TAKES } from '../src/rival-items.ts';
import { createRace, startRace, stepRace, NITRO_MAX, NITRO_PICKUPS } from '../src/game.js';
import { measureEconomy } from '../scripts/pickup-economy.mjs';

test('R2: rival NITRO timing lives in its own module, not in game.js', () => {
  const game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
  assert.doesNotMatch(game, /function rivalWantsNitro/);
  assert.equal(RIVAL_NITRO_CHARGES, 2);
  const nova = { name: 'NOVA', nitro: 2, nitroUses: 0, nitroHop: -1, altitude: 0, speed: 0, distance: 0 };
  assert.equal(rivalWantsNitro({ elapsed: 7.9, length: 5000 }, nova, 0), false);
  assert.equal(rivalWantsNitro({ elapsed: 8, length: 5000 }, nova, 0), true);
});

// R4 (user, 2026-11-02): rivals take NITRO rings and pickups on their line; a take is gone for everyone until it respawns.
function rivalOn(item, difficulty = 'normal') {
  const race = createRace('coast', { mode: 'custom', rivals: 7, difficulty });
  startRace(race); race.phase = 'racing'; race.elapsed = 20;
  const rival = race.rivals[0];
  Object.assign(rival, { nitro: 0, x: item.x, altitude: item.altitude, distance: item.distance + 0.5 });
  return { race, rival, before: item.distance - 0.5 };
}
const pickupItem = tier => ({ distance: 1000, x: 2.5, altitude: 0, tier });
const ringItem = type => ({ distance: 1000, x: 2.5, altitude: 2.5, radius: 4.8, type, group: 0 });

test('R4: a rival crossing a NITRO pickup takes it: charge for the rival, gone for everyone', () => {
  for (const tier of ['cell', 'can', 'tank']) {
    const item = pickupItem(tier), { race, rival, before } = rivalOn(item);
    race.pickups = [item]; race.rings = [];
    rivalCollects(race, rival, before);
    assert.equal(rival.nitro, NITRO_PICKUPS[tier], tier);
    assert.equal(item.downUntil, race.elapsed + ITEM_RESPAWN, tier);
    assert.notEqual(item.taken, true, 'the player\'s own flag is untouched');
    assert.equal(rival.itemTakes, 1);
  }
});

test('R4: rivals take only NITRO rings, never the overcharge, a gone item or one off their line', () => {
  for (const [item, list, taken] of [[ringItem('nitro'), 'rings', true], [ringItem('risk'), 'rings', true], [ringItem('charge'), 'rings', false],
    [ringItem('slipstream'), 'rings', false], [ringItem('mystery'), 'rings', false], [pickupItem('overcharge'), 'pickups', false]]) {
    const { race, rival, before } = rivalOn(item);
    race.rings = []; race.pickups = []; race[list] = [item];
    rivalCollects(race, rival, before);
    assert.equal(item.downUntil !== undefined, taken, item.type ?? item.tier);
  }
  const item = pickupItem('can'), { race, rival, before } = rivalOn(item);
  race.pickups = [item]; race.rings = []; item.downUntil = race.elapsed + 1;
  rivalCollects(race, rival, before);
  assert.equal(rival.nitro, 0, 'gone');
  item.downUntil = undefined; rival.x = item.x + 1.8;
  rivalCollects(race, rival, before);
  assert.equal(rival.nitro, 0, 'off the line: the player\'s 1.7 m box');
});

test('R4: a rival\'s charge caps at the player\'s NITRO_MAX and fires only from a full charge', () => {
  const item = pickupItem('tank'), { race, rival, before } = rivalOn(item);
  race.pickups = [item]; race.rings = []; rival.nitro = NITRO_MAX - 0.5;
  rivalCollects(race, rival, before);
  assert.equal(rival.nitro, NITRO_MAX);
  const half = createRace('coast');
  startRace(half); half.phase = 'racing'; half.elapsed = 60; half.rings = []; half.pickups = [];
  for (const r of half.rivals) Object.assign(r, { nitro: 0.75, nitroUses: 0 });
  stepRace(half, {}, 1 / 60);
  assert.ok(half.rivals.every(r => r.nitroTime === 0 && r.nitro === 0.75), 'no NITRO from a partial charge');
});

test('R4: NITRO timing counts charges already fired, so extra charges keep each rival\'s rhythm', () => {
  const nova = { name: 'NOVA', nitro: 3, nitroUses: 1, nitroHop: -1, altitude: 0, speed: 0, distance: 0 };
  assert.equal(rivalWantsNitro({ elapsed: 25.9, length: 5000 }, nova, 0), false, 'second charge waits for its slot');
  assert.equal(rivalWantsNitro({ elapsed: 26, length: 5000 }, nova, 0), true);
});

// AC3 (rewritten, user 2026-11-02): Easy rivals take a little, never nothing, and never more than EASY_RIVAL_TAKES each.
test('AC3: Easy rivals take at most EASY_RIVAL_TAKES items each per race, and some take one', () => {
  for (const id of ['coast', 'neon', 'tokyo']) {
    const takes = measureEconomy(id, { mode: 'custom', rivals: 7, difficulty: 'easy' }, 600, { rivals: true }).rivalTakes;
    assert.ok(takes.every(n => n <= EASY_RIVAL_TAKES), `${id} ${takes}`);
    assert.ok(takes.some(n => n > 0), `${id} Easy rivals still take a little`);
  }
});

test('R4: Normal rivals only take what lies on their line: collecting never steers them', () => {
  const race = createRace('coast');
  startRace(race); race.phase = 'racing'; race.traffic = [];
  for (let i = 0; i < 60 * 30; i++) {
    stepRace(race, { throttle: true }, 1 / 60);
    for (const r of race.rivals) assert.equal(r.seekX, undefined, r.name);
  }
  assert.ok(race.rivals.some(r => r.itemTakes > 0), 'Normal rivals collect on their line');
});

// R5 (user, 2026-11-02): Hard rivals change lane to reach an item, through the same avoidance as every AI car.
function seekRace(difficulty, props = []) {
  const race = createRace('coast', { mode: 'custom', rivals: 7, difficulty, traffic: 'off' });
  startRace(race); race.phase = 'racing'; race.elapsed = 13; race.props = props; // NOVA's hop cycle restarts: on the road for 6 s
  race.rivals.forEach((r, i) => Object.assign(r, { distance: 3000 + i * 300, x: -7.5, homeX: -7.5, altitude: 0, speed: 60, cooldown: 0 }));
  const rival = race.rivals[0];
  race.rings = []; race.pickups = [{ distance: rival.distance + 150, x: 2.5, altitude: 0, tier: 'can' }]; // 2 lanes away: reachable at 6 m/s
  Object.assign(race.player, { distance: 1000 }); // far behind: no player blocker near
  return { race, rival, item: race.pickups[0] };
}
const drive = (race, seconds) => { for (let i = 0; i < seconds * 60; i++) stepRace(race, {}, 1 / 60); };

test('R5: a Hard rival changes lane to take an item ahead; a Normal rival keeps its lane', () => {
  const hard = seekRace('hard');
  drive(hard.race, 3);
  assert.equal(hard.rival.itemTakes, 1, 'Hard goes for it');
  drive(hard.race, 3);
  assert.equal(hard.rival.x, -7.5, 'and returns to its lane after');
  const normal = seekRace('normal');
  drive(normal.race, 3);
  assert.equal(normal.rival.itemTakes, 0, 'Normal does not steer for items');
});

test('R5: seeking never drives a Hard rival through a solid obstacle', () => {
  const wall = { from: 3080, to: 3160, left: -4.6, right: 4.6, top: 4, bottom: 0 }; // around the item; the -7.5 lane stays open
  const { race, rival, item } = seekRace('hard', [wall]);
  drive(race, 3);
  assert.equal(rival.collisions ?? 0, 0);
  assert.ok(rival.cooldown === 0, 'never knocked by the wall');
  assert.equal(item.downUntil, undefined, 'the item behind the wall stays for someone else');
});
