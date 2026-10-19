import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, racePosition, RACE_LENGTH, ROAD_LIMIT, MAX_SPEED } from '../src/game.js';

function advance(race, seconds, input = {}) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) stepRace(race, input, 1 / 60);
}

function racing() {
  const race = createRace();
  startRace(race);
  advance(race, 3.1);
  race.traffic = [];
  return race;
}

test('starting requires a countdown and countdown holds every racer on the grid', () => {
  const race = createRace();
  assert.equal(race.phase, 'ready');
  startRace(race);
  advance(race, 2, { throttle: true, fly: true });
  assert.equal(race.phase, 'countdown');
  assert.equal(race.player.distance, 0);
  assert.equal(race.player.altitude, 0);
  assert.equal(race.rivals[0].distance, 0);
  advance(race, 1.1);
  assert.equal(race.phase, 'racing');
});

test('accelerating, coasting, braking and steering respect road and speed limits', () => {
  const race = racing();
  advance(race, 8, { throttle: true, steer: 1 });
  assert.ok(race.player.speed > 60 && race.player.speed <= MAX_SPEED);
  assert.ok(race.player.x <= ROAD_LIMIT && race.player.x > 8);
  const speed = race.player.speed;
  advance(race, 1);
  assert.ok(race.player.speed < speed);
  advance(race, 5, { brake: true, steer: -1 });
  assert.equal(race.player.speed, 0);
  assert.ok(race.player.x >= -ROAD_LIMIT);
});

test('thrusters require speed, lift the car, spend fuel and land on release', () => {
  const race = racing();
  advance(race, 1, { fly: true });
  assert.equal(race.player.altitude, 0);
  assert.equal(race.player.fuel, 100);
  advance(race, 3, { throttle: true });
  advance(race, 2, { throttle: true, fly: true });
  assert.ok(race.player.altitude > 4);
  assert.ok(race.player.fuel < 80);
  assert.equal(race.player.thrusting, true);
  advance(race, 5, { throttle: true });
  assert.equal(race.player.altitude, 0);
  assert.equal(race.player.verticalSpeed, 0);
  assert.equal(race.player.thrusting, false);
});

test('exhausted fuel forces landing even if lift stays held, then regenerates on the ground', () => {
  const race = racing();
  advance(race, 3, { throttle: true });
  advance(race, 9, { throttle: true, fly: true });
  assert.equal(race.player.altitude, 0);
  assert.equal(race.player.thrusting, false);
  advance(race, 5, { throttle: true });
  assert.ok(race.player.fuel > 40 && race.player.fuel <= 100);
});

test('a ground collision slows the car once; sufficient flight altitude clears it', () => {
  for (const altitude of [0, 5]) {
    const race = racing();
    Object.assign(race.player, { speed: 60, altitude });
    race.traffic = [{ x: race.player.x, distance: 1, speed: 0 }];
    stepRace(race, {}, 1 / 60);
    if (altitude === 0) {
      assert.equal(race.player.collisions, 1);
      assert.ok(race.player.speed < 40);
      stepRace(race, {}, 1 / 60);
      assert.equal(race.player.collisions, 1);
    } else {
      assert.equal(race.player.collisions, 0);
      assert.ok(race.player.speed > 55);
    }
  }
});

test('pause and invalid frame intervals leave race state unchanged', () => {
  const race = racing();
  race.phase = 'paused';
  const snapshot = structuredClone(race);
  advance(race, 2, { throttle: true, fly: true });
  assert.deepEqual(race, snapshot);
  race.phase = 'racing';
  for (const dt of [0, -1, NaN, Infinity, 5]) {
    const before = structuredClone(race);
    stepRace(race, { throttle: true }, dt);
    assert.deepEqual(race, before);
  }
});

test('all rivals race and use flight; position compares distance, finish freezes the result', () => {
  const race = racing();
  advance(race, 8, { throttle: true });
  assert.equal(race.rivals.length, 3);
  assert.ok(race.rivals.every(rival => rival.distance > 100));
  let airborne = false;
  for (let i = 0; i < 600; i++) {
    stepRace(race, { throttle: true }, 1 / 60);
    airborne ||= race.rivals.some(rival => rival.altitude > 2);
  }
  assert.ok(airborne);
  race.rivals.forEach((rival, i) => { rival.distance = i === 0 ? 4999.5 : 200; });
  Object.assign(race.player, { distance: RACE_LENGTH - 1, speed: 80 });
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.phase, 'finished');
  assert.equal(race.player.distance, RACE_LENGTH);
  assert.equal(racePosition(race), 2);
  assert.ok(race.elapsed > 0);
  const result = structuredClone(race);
  advance(race, 5);
  assert.deepEqual(race, result);
});

test('fresh races reset progress, fuel, collision count and opponents', () => {
  const race = racing();
  advance(race, 5, { throttle: true, fly: true });
  const fresh = createRace();
  assert.equal(fresh.player.distance, 0);
  assert.equal(fresh.player.fuel, 100);
  assert.equal(fresh.player.collisions, 0);
  assert.equal(fresh.elapsed, 0);
  assert.notEqual(fresh.rivals, race.rivals);
});

test('ground boost spends charge instead of recharging while the accelerator is held', () => {
  const race = racing();
  advance(race, 4, { throttle: true });
  advance(race, 5, { throttle: true, boost: true });
  assert.ok(race.player.fuel < 60, `Boost left ${race.player.fuel}% charge`);
  const boostedSpeed = race.player.speed;
  assert.ok(boostedSpeed > MAX_SPEED);
  advance(race, 2, { throttle: true });
  assert.ok(race.player.fuel > 60);
});

test('releasing boost decelerates smoothly and braking overrides both accelerator and boost', () => {
  const race = racing();
  Object.assign(race.player, { speed: 102, fuel: 70 });
  stepRace(race, { throttle: true }, 1 / 60);
  assert.ok(race.player.speed > 100 && race.player.speed < 102);
  const before = race.player.speed;
  stepRace(race, { throttle: true, brake: true, boost: true }, 1 / 60);
  assert.equal(race.player.boosting, false);
  assert.ok(before - race.player.speed > 0.5);
});

test('steering eases in, reverses promptly and recenters when released', () => {
  const race = racing();
  race.player.speed = 60;
  const x = race.player.x;
  stepRace(race, { steer: 1 }, 1 / 60);
  assert.ok(race.player.x > x && race.player.x - x < 0.1);
  advance(race, 0.25, { steer: -1 });
  assert.ok(race.player.steering < -0.8);
  advance(race, 0.5);
  assert.ok(Math.abs(race.player.steering) < 0.01);
});

test('close ground overtakes award charge once, chain within five seconds and reset on contact', () => {
  const race = racing();
  race.rivals = [];
  Object.assign(race.player, { speed: 70, fuel: 50 });
  const traffic = { x: race.player.x + 2.5, distance: -4, speed: 20 };
  race.traffic = [traffic];
  stepRace(race, { boost: true }, 1 / 60);
  assert.equal(race.player.nearMisses, 1);
  assert.equal(race.player.combo, 1);
  assert.ok(race.player.fuel > 57);
  advance(race, 0.2, { boost: true });
  assert.equal(race.player.nearMisses, 1);
  traffic.distance = race.player.distance - 4;
  stepRace(race, { boost: true }, 1 / 60);
  assert.equal(race.player.combo, 2);
  traffic.x = race.player.x;
  traffic.distance = race.player.distance + 1;
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.combo, 0);
  assert.equal(race.player.collisions, 1);
});

test('distant, airborne, slow and recovering passes cannot earn a near miss', () => {
  for (const setup of [{ x: 7.5 }, { altitude: 5 }, { speed: 30 }, { cooldown: 1 }]) {
    const race = racing();
    race.rivals = [];
    Object.assign(race.player, { speed: 70, fuel: 50 }, setup);
    race.traffic = [{ x: 0, distance: -4, speed: 0 }];
    stepRace(race, {}, 1 / 60);
    assert.equal(race.player.nearMisses, 0);
  }
  const race = racing();
  Object.assign(race.player, { combo: 3, nearMiss: { time: race.elapsed - 6 } });
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.combo, 0);
});

test('contact with another car on the passing tick cancels the close-pass reward', () => {
  const race = racing();
  race.rivals = [];
  Object.assign(race.player, { speed: 70, fuel: 50 });
  race.traffic = [
    { x: race.player.x + 2.5, distance: -4, speed: 20 },
    { x: race.player.x, distance: 1, speed: 20 },
  ];
  stepRace(race, { boost: true }, 1 / 60);
  assert.equal(race.player.collisions, 1);
  assert.equal(race.player.nearMisses, 0);
  assert.ok(race.player.fuel < 50);
});

test('finish order uses crossing time when player and rival finish during the same tick', () => {
  for (const [playerDistance, rivalDistance, expectedPosition] of [[4999.9, 4999.5, 1], [4999, 4999.9, 2]]) {
    const race = racing();
    Object.assign(race.player, { distance: playerDistance, speed: 88, x: 7.5 });
    Object.assign(race.rivals[0], { distance: rivalDistance, speed: 70 });
    stepRace(race, {}, 1 / 60);
    assert.equal(race.phase, 'finished');
    assert.equal(race.result.position, expectedPosition);
  }
});

test('vehicle contact records a bounded impact and pushes the player away only once per contact', () => {
  const race = racing();
  Object.assign(race.player, { speed: 65, x: 2.5 });
  race.traffic = [{ x: 3, distance: 2, speed: 25 }];
  stepRace(race, {}, 1 / 60);
  const impact = race.player.impact;
  assert.equal(impact?.kind, 'vehicle');
  assert.ok(impact.intensity > 0 && impact.intensity <= 1);
  assert.ok(impact.speedLost > 20);
  assert.ok(race.player.x < 2.5);
  assert.equal(race.player.collisions, 1);
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.impact, impact);
});

test('guardrail contact slows and rebounds a grounded car but a flying car clears the rail', () => {
  for (const altitude of [0, 5]) {
    const race = racing();
    // Deliberate edit (barrier scrape): a hard, fully-deflected steer is the head-on case that still uses contact().
    Object.assign(race.player, { speed: 60, x: ROAD_LIMIT, altitude, steering: 1 });
    stepRace(race, { throttle: true, steer: 1 }, 1 / 60);
    if (altitude === 0) {
      assert.equal(race.player.impact?.kind, 'barrier');
      assert.ok(race.player.x < ROAD_LIMIT);
      assert.ok(race.player.speed < 55);
    } else {
      assert.equal(race.player.impact, null);
      assert.equal(race.player.collisions, 0);
    }
  }
});

test('landing emits one touchdown event with the actual descent speed and resets with a new race', () => {
  const race = racing();
  Object.assign(race.player, { altitude: 0.1, verticalSpeed: -8, speed: 50 });
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.altitude, 0);
  assert.ok(race.player.landing?.speed > 8);
  assert.equal(race.player.landing.time, race.elapsed);
  const landing = race.player.landing;
  advance(race, 1, { throttle: true });
  assert.equal(race.player.landing, landing);
  assert.equal(createRace().player.impact, null);
  assert.equal(createRace().player.landing, null);
});

test('air dash: holding fly and boost together drains fuel at 22 per second and keeps the boost speed cap', () => {
  const race = racing();
  race.player.speed = 80;
  advance(race, 1, { fly: true, boost: true });
  assert.ok(Math.abs(race.player.fuel - 78) < 0.5);
  advance(race, 1, { fly: true, boost: true });
  const car = race.player;
  assert.equal(car.thrusting, true);
  assert.equal(car.boosting, true);
  assert.equal(car.exhausted, false);
  assert.ok(car.speed > MAX_SPEED && car.speed <= MAX_SPEED + 14);
});

test('steering input ramps to full over 0.15 s and high-speed lateral speed caps at 9 m/s', () => {
  const race = racing();
  Object.assign(race.player, { speed: MAX_SPEED, x: -7.5 });
  advance(race, 0.05, { throttle: true, steer: 1 });
  assert.ok(Math.abs(race.player.steering - 1 / 3) < 0.01);
  advance(race, 0.2, { throttle: true, steer: 1 });
  assert.equal(race.player.steering, 1);
  const x = race.player.x;
  advance(race, 0.5, { throttle: true, steer: 1 });
  assert.ok(Math.abs(race.player.x - x - 4.5) < 0.05);
});

test('lane assist eases a released car to the nearest lane centre only when enabled', () => {
  for (const laneAssist of [true, false]) {
    const race = racing();
    Object.assign(race.player, { speed: 40, x: 3.6 });
    advance(race, 2, { throttle: true, laneAssist });
    assert.ok(laneAssist ? Math.abs(race.player.x - 2.5) < 0.05 : race.player.x === 3.6);
  }
  const race = racing();
  Object.assign(race.player, { speed: 40, x: 3.6 });
  advance(race, 0.5, { throttle: true, laneAssist: true, steer: 1 });
  assert.ok(race.player.x > 3.6);
});

test('a shallow barrier touch scrapes: 0.92 speed, back on the road, no collision, combo kept, once per scrape', () => {
  const race = racing();
  Object.assign(race.player, { speed: 60, x: ROAD_LIMIT, steering: 0.3, combo: 3 });
  advance(race, 0.3, { steer: 0.3 });
  const car = race.player;
  assert.equal(car.impact, null);
  assert.equal(car.collisions, 0);
  assert.equal(car.combo, 3);
  assert.equal(car.cooldown, 0);
  assert.ok(car.x < ROAD_LIMIT);
  assert.ok(car.speed < 60 * 0.92 && car.speed > 60 * 0.92 - 1.5);
});

test('vehicle collision width is 1.7 so a 1.8 m lateral gap is not a crash', () => {
  for (const [gap, collisions] of [[1.8, 0], [1.6, 1]]) {
    const race = racing();
    Object.assign(race.player, { speed: 65, x: 2.5 });
    race.traffic = [{ x: 2.5 + gap, distance: 2, speed: 25 }];
    stepRace(race, {}, 1 / 60);
    assert.equal(race.player.collisions, collisions);
  }
});

test('takeoff buffer: FLY pressed below 18 m/s lifts off once fast enough, but only within 1.5 s of release', () => {
  const peak = (gapSeconds) => {
    const race = racing();
    race.player.speed = 5;
    advance(race, 0.1, { fly: true });
    advance(race, gapSeconds, {});
    let max = 0;
    for (let frame = 0; frame < 240; frame++) {
      stepRace(race, { throttle: true }, 1 / 60);
      max = Math.max(max, race.player.altitude);
    }
    return max;
  };
  assert.ok(peak(0) > 0.5);
  assert.equal(peak(2), 0);
  const race = racing();
  race.player.speed = 5;
  advance(race, 3, { throttle: true });
  assert.equal(race.player.altitude, 0);
});

test('glide: releasing FLY in the air lowers fall acceleration to 7, a held but powerless FLY keeps 11', () => {
  for (const [fly, fall] of [[false, 7], [true, 11]]) {
    const race = racing();
    Object.assign(race.player, { speed: 60, altitude: 10, fuel: 0, exhausted: true });
    advance(race, 0.5, { fly });
    assert.ok(Math.abs(race.player.verticalSpeed + fall * 0.5) < 0.2);
  }
});
