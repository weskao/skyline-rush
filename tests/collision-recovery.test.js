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

function packedRoad(reverse = false) {
  const race = raceAt(0);
  const { player } = race;
  const leader = traffic(0, 304.45, 22);
  const left = traffic(-2, 301, 22), right = traffic(2, 301, 22);
  for (const other of [leader, left, right]) other.laneShift = 0;
  const cars = [leader, left, right];
  race.traffic = reverse ? cars.reverse() : cars;
  return { race, player, leader, left, right };
}

for (const hz of [30, 60, 120]) {
  test(`boxed in at ${hz} Hz: follows the lead car with one impact even after recovery expires`, () => {
    for (const reverse of [false, true]) {
      const { race, player, leader } = packedRoad(reverse);
      for (let frame = 0; frame < hz * 3; frame++) {
        stepRace(race, { throttle: true, laneAssist: true }, 1 / hz);
        assert.ok(race.traffic.every(other => !overlap(player, other)), `frame ${frame}: no vehicle overlap`);
        assert.ok(Math.abs(player.x) < 0.28, `frame ${frame}: no forced lane change (${player.x})`);
        assert.ok(leader.distance - player.distance >= 4.4, `frame ${frame}: no pass through the lead car`);
      }
      assert.equal(player.collisions, 1);
      assert.ok(player.cooldown === 0);
      assert.ok(Math.abs(player.speed - leader.speed) < 0.2, 'follows actual lead pace');
    }
  });
}

test('the player can steer into a lane that becomes free and accelerate past the pack', () => {
  const { race, player, leader, left } = packedRoad();
  for (let i = 0; i < 30; i++) tick(race);
  race.traffic = race.traffic.filter(other => other !== left);
  for (let i = 0; i < 120; i++) stepRace(race, { throttle: true, steer: -0.4 }, 1 / 60);
  assert.equal(player.collisions, 1);
  assert.ok(player.x < -2 && player.distance > leader.distance + 4.4);
});

test('a new forward contact after leaving the queue can register a new impact', () => {
  const { race, player, leader } = packedRoad();
  for (let i = 0; i < 150; i++) tick(race);
  assert.equal(player.collisions, 1);
  leader.distance += 20;
  tick(race);
  leader.distance = player.distance + 4.45;
  player.speed = 45;
  tick(race);
  assert.equal(player.collisions, 2);
});

test('a shield absorbs the first boxed-in contact while the lead car still blocks forward travel', () => {
  const { race, player, leader } = packedRoad();
  player.effects.shield = 10;
  player.combo = 4;
  for (let i = 0; i < 120; i++) tick(race);
  assert.equal(player.effects.shield, 0);
  assert.ok(player.shieldBlock);
  assert.equal(player.collisions, 0);
  assert.equal(player.combo, 4);
  assert.ok(leader.distance - player.distance >= 4.4);
});

test('Ghost Phase clears several cars in a row while the protection timer is active', () => {
  const { race, player, leader } = packedRoad();
  race.traffic.push(traffic(0, leader.distance + 6, 22));
  player.effects.ghost = 3;
  player.cooldown = 1.5;
  for (let i = 0; i < 40; i++) tick(race);
  assert.equal(player.collisions, 0);
  assert.ok(player.distance > Math.max(...race.traffic.map(other => other.distance)) + 4.4);
});

test('pack following keeps the graph odometer and actual road position in step', () => {
  const race = raceAt(0, {}, 'dune-tempest');
  const { course, player } = race;
  const edge = course.spec.graph.groundRoute[0];
  const cars = [...course.cars.keys()].filter(id => id.startsWith('traffic-')).slice(0, 3);
  const [leader, left, right] = [traffic(0, 304.45, 22), traffic(-2, 301, 22), traffic(2, 301, 22)];
  race.traffic = [leader, left, right];
  placeCourseCar(course, 'YOU', edge, player.distance, player);
  race.traffic.forEach((other, i) => {
    other.id = cars[i];
    other.laneShift = 0;
    placeCourseCar(course, other.id, edge, other.distance, other);
  });
  for (let frame = 0; frame < 60; frame++) tick(race);
  const you = course.cars.get('YOU');
  assert.ok(course.cars.get(leader.id).travel.localS - you.travel.localS >= 4.4);
  assert.ok(Math.abs(you.travel.localS + you.edgeStart - player.distance) < 1e-8);
  assert.equal(course.rejections, 0);
  assert.equal(player.collisions, 1);
});

test('holding the steering against a parallel car keeps one contact after the cooldown', () => {
  const race = raceAt(0);
  const { player } = race;
  const other = traffic(1.66, 300.1, 40);
  other.laneShift = 0;
  race.traffic = [other];
  player.speed = 40;
  player.steering = 0.8;
  for (let frame = 0; frame < 150; frame++) {
    // Match the side car's pace and keep its own lane to isolate the sustained contact.
    other.distance = player.distance + 0.1;
    other.speed = other.cruise = player.speed = 40;
    stepRace(race, { throttle: true, steer: 0.8 }, 1 / 60);
    assert.ok(!overlap(player, other), `frame ${frame}: no side overlap`);
  }
  assert.equal(player.collisions, 1);
});

test('at a wall, steering into a boxed-in neighbour leaves the player on the road', () => {
  const race = raceAt(10.2);
  const { player } = race;
  const neighbour = traffic(8.48, 300.1, 35);
  const inside = traffic(6.77, 300.1, 35);
  for (const other of [neighbour, inside]) other.laneShift = 0;
  race.traffic = [neighbour, inside];
  player.speed = 35;
  player.steering = -1;
  for (let i = 0; i < 150; i++) {
    for (const other of race.traffic) other.distance = player.distance + 0.1;
    player.speed = 35;
    stepRace(race, { throttle: true, steer: -1 }, 1 / 60);
    assert.ok(player.x <= 10.2 && player.x >= 10.18);
    assert.ok(!overlap(player, neighbour));
  }
  assert.equal(player.collisions, 1);
});

test('a fast step cannot cross a full queue when the player starts outside the leader hitbox', () => {
  const { race, player, leader, left, right } = packedRoad();
  player.speed = 125;
  leader.distance = 305;
  left.distance = right.distance = 311;
  stepRace(race, { throttle: true, nitro: true }, 0.1);
  assert.ok(leader.distance - player.distance >= 4.4);
  assert.equal(player.collisions, 1);
});

test('a boxed-in side brush keeps the last clear lane when neither car can slide sideways', () => {
  const race = raceAt(0);
  const { player } = race;
  const left = traffic(-1.7, 300, 40), right = traffic(1.7, 300, 40), outer = traffic(3.4, 300, 40);
  for (const other of [left, right, outer]) other.laneShift = 0;
  race.traffic = [left, right, outer];
  player.speed = 40;
  player.steering = 1;
  stepRace(race, { steer: 1, throttle: true }, 1 / 60);
  assert.ok(race.traffic.every(other => !overlap(player, other)));
  assert.ok(Math.abs(player.x) < 0.01);
  assert.equal(player.collisions, 1);
});
