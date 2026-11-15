import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, useHeldItem } from '../src/game.js';
import { placeCourseCar } from '../src/course-race.ts';

const traffic = (x, distance, speed = 23) => ({ x, homeX: x, distance, speed, cruise: speed, altitude: 0, cooldown: 0 });
const scenery = (distance, left = 2, right = 6) => ({ from: distance, to: distance + 5, left, right, bottom: 0, top: 3 });
const tick = (race, hz = 60) => stepRace(race, { throttle: true }, 1 / hz);
const overlap = (a, b) => Math.abs(a.x - b.x) < 1.7 && Math.abs(a.distance - b.distance) < 4.4;

function raceAt(x, options = {}, track = 'coast') {
  const race = createRace(track, options);
  Object.assign(race, { phase: 'racing', rivals: [], traffic: [], rings: [], pickups: [], props: [], hazards: [] });
  Object.assign(race.player, { distance: 300, x, speed: 50 });
  return race;
}

for (const hz of [30, 60, 120]) {
  test(`two contacts ${hz} Hz: cars separate and only the first hit penalizes the player`, () => {
    const race = raceAt(0);
    const player = race.player;
    race.traffic = [traffic(0.1, 303)];
    tick(race, hz);
    assert.equal(player.collisions, 1);
    const first = player.impact;
    const speed = player.speed;
    const second = traffic(player.x, player.distance + 3);
    race.traffic = [second];
    player.combo = 4;
    tick(race, hz);
    assert.equal(player.collisions, 1);
    assert.equal(player.impact, first);
    assert.equal(player.combo, 4);
    assert.ok(player.speed >= speed, 'the second contact cannot bleed player speed');
    assert.ok(!overlap(player, second), 'the second contact still separates both bodies');
  });
}

test('a car still slides clear of solid scenery during collision grace', () => {
  const race = raceAt(4);
  race.props = [scenery(302)];
  race.player.cooldown = 1;
  tick(race);
  assert.ok(race.player.x + 0.85 < race.props[0].left);
  assert.equal(race.player.collisions, 0);
  assert.ok(race.player.speed > 50);
});

test('a shield consumes one hit and separates the cars without costing speed or combo', () => {
  const race = raceAt(0);
  const other = traffic(0, 303);
  race.traffic = [other];
  race.player.effects.shield = 10;
  race.player.combo = 4;
  tick(race);
  assert.equal(race.player.effects.shield, 0);
  assert.ok(race.player.shieldBlock);
  assert.equal(race.player.collisions, 0);
  assert.equal(race.player.combo, 4);
  assert.ok(race.player.speed > 50);
  assert.ok(!overlap(race.player, other));
});

test('Ghost Phase expiry lets the original car clear but a new car can cause a crash immediately', () => {
  const race = raceAt(0, { mode: 'custom', activeItems: true });
  const player = race.player;
  const first = traffic(0, 300.5);
  race.traffic = [first];
  player.heldItem = 'ghost';
  assert.equal(useHeldItem(race), 'ghost');
  tick(race);
  assert.ok(overlap(player, first));
  assert.equal(player.collisions, 0);
  player.effects.ghost = 0.01;
  tick(race);
  assert.equal(player.effects.ghost, 0);
  assert.equal(player.collisions, 0);
  assert.ok(overlap(player, first), 'the old overlap is not forcibly resolved at expiry');
  const second = traffic(0, player.distance + 3);
  race.traffic.push(second);
  tick(race);
  assert.equal(player.collisions, 1);
  assert.ok(!overlap(player, second));
});

test('Ghost Phase expiry clears the scenery part already overlapping and blocks the next one', () => {
  const race = raceAt(4);
  const player = race.player;
  race.props = [scenery(299), scenery(306)];
  player.effects.ghost = 0.01;
  tick(race);
  assert.ok(player.x > 3.9, "the car stays on its line inside the old overlap");
  assert.equal(player.collisions, 0);
  for (let frame = 0; frame < 8 && !player.collisions; frame++) tick(race);
  assert.equal(player.collisions, 1);
  assert.ok(player.x + 0.85 < 2);
});

test('Ghost Phase still collides with the road boundary', () => {
  const race = raceAt(10.2);
  race.player.effects.ghost = 3;
  race.player.steering = 1;
  stepRace(race, { throttle: true, steer: 1 }, 1 / 60);
  assert.equal(race.player.impact?.kind, 'barrier');
});

test('a blocking track hazard separates the car while the player is protected', () => {
  const race = raceAt(4);
  race.hazards = [{ distance: 300.5, x: 4, moving: false, phase: 0, speed: 0 }];
  race.player.cooldown = 1.5;
  tick(race);
  assert.ok(Math.abs(race.player.x - 4) >= 2.4);
  assert.equal(race.player.collisions, 0);
});

test('CourseGraph hazards clear the body along the safe side during grace', () => {
  const race = raceAt(0, {}, 'dune-tempest');
  const hazard = race.course.spec.hazards.find(h => h.safePassSide === 'left');
  Object.assign(race.player, { x: hazard.lateral, cooldown: 1.5 });
  placeCourseCar(race.course, 'YOU', hazard.edgeId, hazard.localS - 0.5, race.player);
  tick(race);
  assert.ok(race.player.x < hazard.lateral - hazard.radius);
  assert.equal(race.course.cars.get('YOU').travel.lateral, race.player.x);
  assert.equal(race.player.collisions, 0);
});
