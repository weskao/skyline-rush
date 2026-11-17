import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, useHeldItem } from '../src/game.js';
import { placeCourseCar } from '../src/course-race.ts';
import { Box3 } from 'three';
import { CAR_STYLES, TRAFFIC_CAR_STYLES, makeCar } from '../src/car-model.js';

const traffic = (x, distance, speed = 23) => ({ x, homeX: x, distance, speed, cruise: speed, altitude: 0, cooldown: 0 });
const scenery = (distance, left = 2, right = 6) => ({ from: distance, to: distance + 5, left, right, bottom: 0, top: 3 });
const tick = (race, hz = 60) => stepRace(race, { throttle: true }, 1 / hz);
const overlap = (a, b) => Math.abs(a.x - b.x) < 1.7 && Math.abs(a.distance - b.distance) < 4.4;

function measuredBody(style, scale = 1) {
  const model = makeCar(style);
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const hull = new Box3().setFromObject(model.userData.body, true);
  for (const wheel of model.userData.wheels) hull.expandByObject(wheel, true);
  const bumpers = new Box3().setFromObject(model, true);
  return { halfWidth: hull.max.x, front: -bumpers.min.z, rear: bumpers.max.z };
}

const playerBody = measuredBody(CAR_STYLES.roadster);
const trafficBodies = TRAFFIC_CAR_STYLES.map(style => measuredBody(style, 0.96));
function bodyOverlap(player, other, index) {
  const body = trafficBodies[index % trafficBodies.length];
  const gap = other.distance - player.distance;
  return Math.abs(other.x - player.x) < playerBody.halfWidth + body.halfWidth &&
    gap < playerBody.front + body.rear && gap > -(playerBody.rear + body.front);
}

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
  const leader = traffic(0, 305.05, 22);
  const left = traffic(-2.45, 301, 22), right = traffic(2.45, 301, 22);
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
        assert.ok(race.traffic.every((other, index) => !bodyOverlap(player, other, index)), `frame ${frame}: no visible body overlap`);
        assert.ok(Math.abs(player.x) < 0.28, `frame ${frame}: no forced lane change (${player.x})`);
        assert.ok(leader.distance - player.distance >= playerBody.front + trafficBodies[race.traffic.indexOf(leader)].rear, `frame ${frame}: no pass through the lead car`);
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
  for (let i = 0; i < 180; i++) stepRace(race, { throttle: true, steer: -0.4 }, 1 / 60);
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
  assert.ok(leader.distance - player.distance >= playerBody.front + trafficBodies[0].rear);
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
  const [leader, left, right] = [traffic(0, 305.05, 22), traffic(-2.45, 301, 22), traffic(2.45, 301, 22)];
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
  const neighbour = traffic(7.80, 300.1, 35);
  const inside = traffic(5.5, 300.1, 35);
  for (const other of [neighbour, inside]) other.laneShift = 0;
  race.traffic = [neighbour, inside];
  player.speed = 35;
  player.steering = -1;
  for (let i = 0; i < 150; i++) {
    for (const other of race.traffic) other.distance = player.distance + 0.1;
    player.speed = 35;
    stepRace(race, { throttle: true, steer: -1 }, 1 / 60);
    assert.ok(player.x <= 10.2 && player.x >= 10.18);
    assert.ok(!bodyOverlap(player, neighbour, 0));
  }
  assert.equal(player.collisions, 1);
});

test('a fast step cannot cross a full queue when the player starts outside the leader hitbox', () => {
  const { race, player, leader, left, right } = packedRoad();
  player.speed = 125;
  leader.distance = 305;
  left.distance = right.distance = 311;
  stepRace(race, { throttle: true, nitro: true }, 0.1);
  assert.ok(leader.distance - player.distance >= playerBody.front + trafficBodies[0].rear);
  assert.equal(player.collisions, 1);
});

test('a boxed-in side brush keeps the last clear lane when neither car can slide sideways', () => {
  const race = raceAt(0);
  const { player } = race;
  const left = traffic(-2.4, 300, 40), right = traffic(2.4, 300, 40), outer = traffic(4.7, 300, 40);
  for (const other of [left, right, outer]) other.laneShift = 0;
  race.traffic = [left, right, outer];
  player.speed = 40;
  player.steering = 1;
  stepRace(race, { steer: 1, throttle: true }, 1 / 60);
  assert.ok(race.traffic.every(other => !overlap(player, other)));
  assert.ok(Math.abs(player.x) < 0.01);
  assert.equal(player.collisions, 1);
});

test('an opaque Roadster separates from a traffic car whose shell is wider than the old hitbox', () => {
  const race = raceAt(0);
  const { player } = race;
  const commuter = traffic(2, 300.1, 40);
  race.traffic = [commuter];
  player.speed = 40;
  player.cooldown = 1;
  assert.ok(bodyOverlap(player, commuter, 0), 'the real car models overlap in the reported arrangement');
  tick(race);
  assert.ok(!bodyOverlap(player, commuter, 0), 'the visible hulls clear after the simulation step');
  assert.equal(player.collisions, 0);
});

test('the shorter hatch leaves room where a commuter would reach the player', () => {
  for (const [index, expected] of [[0, 1], [2, 0]]) {
    const race = raceAt(0);
    const { player } = race;
    player.speed = 30;
    const approaching = traffic(0, 295.34, 40);
    race.traffic = [traffic(-8, 340, 30), traffic(8, 340, 30)];
    race.traffic.splice(index, 0, approaching);
    tick(race, 120);
    assert.ok(!bodyOverlap(player, approaching, index));
    assert.equal(player.collisions, expected);
  }
});

for (const hz of [30, 60, 120]) for (const laneAssist of [false, true]) {
  test(`five-car pack at ${hz} Hz with lane assist ${laneAssist}: a braking leader keeps solid body clearance`, () => {
    const race = raceAt(0);
    const { player } = race;
    const leader = traffic(0, 304.78, 22);
    const left = traffic(-2.45, 301, 22), right = traffic(2.45, 301, 22);
    race.traffic = [leader, left, right, traffic(0, 313, 21), traffic(0, 322, 20)];
    for (const other of race.traffic) other.laneShift = 0;
    for (let frame = 0; frame < hz * 3; frame++) {
      if (frame === Math.round(hz / 4)) leader.speed = leader.cruise = 14;
      stepRace(race, { throttle: true, laneAssist }, 1 / hz);
      for (const [index, other] of race.traffic.entries()) {
        assert.ok(!bodyOverlap(player, other, index), `frame ${frame}: visible body overlaps traffic car ${index}`);
      }
      assert.ok(leader.distance > player.distance, `frame ${frame}: player crosses the solid leading car`);
    }
    assert.equal(player.collisions, 1);
    assert.equal(player.cooldown, 0);
    assert.ok(Math.abs(player.speed - leader.speed) < 0.2);
  });
}

test('Ghost Phase can finish a visible flank overlap outside the old hitbox', () => {
  const race = raceAt(0, { mode: 'custom', activeItems: true });
  const { player } = race;
  const commuter = traffic(2, 300.1, 40);
  commuter.laneShift = 0;
  race.traffic = [commuter];
  player.speed = 40;
  player.effects.ghost = 0.01;
  tick(race);
  assert.equal(player.effects.ghost, 0);
  assert.ok(bodyOverlap(player, commuter, 0), 'the player can finish clearing the original visible overlap');
  assert.equal(player.collisions, 0);
  commuter.distance += 15;
  tick(race);
  commuter.distance = player.distance + 0.1;
  tick(race);
  assert.equal(player.collisions, 1, 'the same car is solid again after clearance');
});

test('an already compressed pack clears both flanks while the front car still blocks the player', () => {
  const { race, player, leader, left, right } = packedRoad();
  left.x = left.homeX = -2;
  right.x = right.homeX = 2;
  tick(race);
  for (const [index, other] of race.traffic.entries())
    assert.ok(!bodyOverlap(player, other, index), `traffic car ${index} still clips the player`);
  assert.ok(Math.abs(player.x) < 0.25);
  assert.ok(leader.distance > player.distance);
  assert.equal(player.collisions, 1);
});

test('a trailing car cannot drive into the player while a packed leader is braking', () => {
  const { race, player, leader, left, right } = packedRoad();
  const rear = traffic(0, 293.5, 35);
  rear.laneShift = 0;
  race.traffic.push(rear);
  for (let frame = 0; frame < 120; frame++) {
    if (frame === 4) for (const car of [leader, left, right]) car.speed = car.cruise = 14;
    stepRace(race, { throttle: true, laneAssist: true }, 1 / 60);
    assert.ok(leader.distance > player.distance && player.distance > rear.distance);
    assert.ok(!bodyOverlap(player, rear, 3), `frame ${frame}: the trailing car clips the boxed-in player`);
  }
});

test('shallow hull contact makes room without the full speed penalty of a direct hit', () => {
  const race = raceAt(0);
  const { player } = race;
  const commuter = traffic(2.10, 300.1, 40);
  commuter.laneShift = 0;
  race.traffic = [commuter];
  player.speed = 40;
  tick(race);
  assert.ok(!bodyOverlap(player, commuter, 0));
  assert.ok(player.speed > 35, 'a glancing rub should keep at least seven eighths of the speed');
});

test('a respawn ahead of a followed car releases it: the fall is not replayed behind its bumper', () => {
  const { race, player, leader } = packedRoad();
  for (let i = 0; i < 30; i++) tick(race);
  assert.equal(player.collisions, 1, 'boxed in behind the leader');
  race.sections = [{ type: 'gap', from: player.distance + 1, to: player.distance + 40 }];
  while (player.falls === 0 && player.distance < race.sections[0].to) tick(race);
  const respawn = player.fall?.distance;
  assert.ok(respawn > leader.distance + 20, 'the queue led the car into the gap; it respawned well ahead of the leader');
  for (let i = 0; i < 30; i++) tick(race);
  assert.equal(player.falls, 1);
  assert.ok(player.distance >= respawn, `stays ahead of the respawn (${player.distance.toFixed(1)} m of ${respawn} m)`);
});
