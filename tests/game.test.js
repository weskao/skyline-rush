import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, racePosition, RACE_LENGTH, RACE_TRACKS, TUNNEL_CEILING, ROAD_LIMIT, MAX_SPEED, NITRO_MAX, DRIFT_MIN_SPEED, RING_RADIUS, RISK_RING_RADIUS, RISK_SCORE, MYSTERY_EFFECTS, mysteryEffect, SLIPSTREAM_TIME, SLIPSTREAM_CAP_BONUS, RUBBER_BAND_MAX, RIVAL_NITRO_CHARGES, RIVAL_NITRO_NOVA_FIRST, RIVAL_NITRO_BONUS, RIVAL_NITRO_TIME } from '../src/game.js';

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
  advance(race, 5, { brake: true, steer: -1 }); // drifts down to 45 m/s, then hard-brakes to a stop
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

test('review fixes: full-lock rail hit at boost speed is still a collision, lane assist waits out contact and standstill, buffer does not block recharge', () => {
  let race = racing();
  Object.assign(race.player, { speed: 100, x: ROAD_LIMIT, steering: 1 });
  stepRace(race, { steer: 1 }, 1 / 60);
  assert.equal(race.player.impact?.kind, 'barrier');

  race = racing();
  Object.assign(race.player, { speed: 0, x: 4.5 });
  advance(race, 1, { brake: true, laneAssist: true });
  assert.equal(race.player.x, 4.5);

  race = racing();
  Object.assign(race.player, { speed: 40, x: 3.6, cooldown: 1 });
  advance(race, 0.5, { throttle: true, laneAssist: true });
  assert.equal(race.player.x, 3.6);

  race = racing();
  Object.assign(race.player, { speed: 5, fuel: 10, flyBuffer: 1.5 });
  advance(race, 0.5, {});
  assert.ok(race.player.fuel > 10);
});

// --- Track data and special sections ---------------------------------------------------------

const TRACK_IDS = ['coast', 'neon', 'canyon', 'aurora'];

function racingOn(trackId) {
  const race = createRace(trackId);
  startRace(race);
  advance(race, 3.1);
  race.traffic = [];
  return race;
}

function sectionOf(trackId, type, index = 0) {
  return RACE_TRACKS[trackId].sections.filter(section => section.type === type)[index];
}

test('the track table holds all four tracks and coast matches the original race', () => {
  assert.deepEqual(Object.keys(RACE_TRACKS), TRACK_IDS);
  assert.deepEqual(TRACK_IDS.map(id => RACE_TRACKS[id].length), [5000, 4000, 6000, 5500]);
  assert.equal(RACE_LENGTH, RACE_TRACKS.coast.length);
  assert.deepEqual(createRace(), createRace('coast'));
  const coast = createRace();
  assert.equal(coast.trackId, 'coast');
  assert.equal(coast.length, 5000);
  assert.equal(coast.traffic.length, 36);
  assert.equal(coast.traffic[1].distance, 295);
  assert.equal(createRace('neon').traffic.length, 54);
  assert.throws(() => createRace('moon'), /Unknown track/);
});

test('special sections stay on the road, never overlap and cover each track signature', () => {
  for (const id of TRACK_IDS) {
    const { length, sections } = RACE_TRACKS[id];
    sections.forEach((section, i) => {
      assert.ok(section.from > 0 && section.from < section.to && section.to < length - 100);
      assert.ok(i === 0 || sections[i - 1].to <= section.from);
    });
  }
  assert.equal(RACE_TRACKS.coast.sections.length, 0);
  assert.ok(sectionOf('neon', 'tunnel'));
  assert.ok([2, 3].includes(RACE_TRACKS.canyon.sections.filter(section => section.type === 'gap').length));
  assert.ok(sectionOf('canyon', 'crosswind') && sectionOf('aurora', 'ice') && sectionOf('aurora', 'uphill'));
});

test('stepRace looks up the section from the current distance', () => {
  const race = racingOn('aurora');
  const ice = sectionOf('aurora', 'ice');
  race.player.distance = ice.from + 1;
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.section, 'ice');
  race.player.distance = ice.from - 50;
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.section, null);
});

test('every track can be finished', () => {
  for (const id of TRACK_IDS) {
    const race = racingOn(id);
    assert.equal(race.trackId, id);
    advance(race, 300, { throttle: true });
    assert.equal(race.phase, 'finished', id);
    assert.equal(race.player.distance, RACE_TRACKS[id].length);
    assert.ok(race.result.time > 30, id);
    const fresh = racingOn(id);
    fresh.rivals.forEach(rival => { rival.distance = 100; });
    Object.assign(fresh.player, { distance: fresh.length - 1, speed: 80 });
    stepRace(fresh, { throttle: true }, 1 / 60);
    assert.equal(fresh.phase, 'finished', id);
    assert.equal(fresh.result.position, 1);
  }
});

test('flying into a tunnel roof is barrier contact; driving or flying outside is safe', () => {
  const tunnel = sectionOf('neon', 'tunnel');
  const high = racingOn('neon');
  Object.assign(high.player, { distance: tunnel.from + 10, speed: 50, altitude: 6 });
  stepRace(high, {}, 1 / 60);
  assert.equal(high.player.collisions, 1);
  assert.equal(high.player.impact.kind, 'barrier');
  assert.ok(high.player.altitude < TUNNEL_CEILING);
  assert.ok(high.player.speed < 50 * 0.8);

  const low = racingOn('neon');
  Object.assign(low.player, { distance: tunnel.from + 10, speed: 50, altitude: 1 });
  stepRace(low, {}, 1 / 60);
  assert.equal(low.player.collisions, 0);

  const outside = racingOn('neon');
  Object.assign(outside.player, { distance: tunnel.from - 100, speed: 50, altitude: 6 });
  stepRace(outside, {}, 1 / 60);
  assert.equal(outside.player.collisions, 0);
  assert.equal(outside.player.altitude > TUNNEL_CEILING, true);
});

test('falling into a gap slows the car and respawns it past the gap; flying over is safe', () => {
  const gap = sectionOf('canyon', 'gap');
  const fall = racingOn('canyon');
  Object.assign(fall.player, { distance: gap.from + 5, speed: 60 });
  stepRace(fall, {}, 1 / 60);
  assert.equal(fall.player.falls, 1);
  assert.ok(fall.player.distance > gap.to);
  assert.ok(fall.player.speed < 40);
  assert.equal(fall.player.altitude, 0);
  stepRace(fall, {}, 1 / 60);
  assert.equal(fall.player.falls, 1);

  const flight = racingOn('canyon');
  Object.assign(flight.player, { distance: gap.from + 5, speed: 60, altitude: 5 });
  stepRace(flight, {}, 1 / 60);
  assert.equal(flight.player.falls, 0);
  assert.ok(flight.player.distance < gap.to);
  assert.ok(flight.player.speed > 55);
});

test('crosswind pushes the car sideways only inside its zone', () => {
  const wind = sectionOf('canyon', 'crosswind');
  const inside = racingOn('canyon');
  Object.assign(inside.player, { distance: wind.from + 10, speed: 30, x: 0 });
  const outside = racingOn('canyon');
  Object.assign(outside.player, { distance: wind.from - 200, speed: 30, x: 0 });
  advance(inside, 0.5);
  advance(outside, 0.5);
  assert.ok(inside.player.x * (wind.dir ?? 1) > 1);
  assert.equal(outside.player.x, 0);
});

test('ice slows the steering response compared with dry road', () => {
  const ice = sectionOf('aurora', 'ice');
  const slick = racingOn('aurora');
  Object.assign(slick.player, { distance: ice.from + 10, speed: 40 });
  const dry = racingOn('aurora');
  Object.assign(dry.player, { distance: ice.from - 200, speed: 40 });
  advance(slick, 0.2, { steer: 1 });
  advance(dry, 0.2, { steer: 1 });
  assert.ok(slick.player.steering > 0 && slick.player.steering < dry.player.steering * 0.6);
  assert.ok(slick.player.x < dry.player.x);
});

function press(race, input = {}) {
  stepRace(race, { ...input, nitro: true }, 1 / 60);
  stepRace(race, input, 1 / 60);
}

test('pickups come only from the track seed, are reproducible and cover every tier with one overcharge', () => {
  const random = Math.random;
  Math.random = () => { throw new Error('Math.random used'); };
  try {
    for (const id of TRACK_IDS) {
      const { pickups, length, sections } = createRace(id);
      assert.deepEqual(pickups, createRace(id).pickups);
      assert.deepEqual(new Set(pickups.map(p => p.tier)), new Set(['cell', 'can', 'tank', 'overcharge']), id);
      assert.equal(pickups.filter(p => p.tier === 'overcharge').length, 1, id);
      for (const pickup of pickups) {
        assert.deepEqual(Object.keys(pickup), ['distance', 'x', 'altitude', 'tier']);
        assert.ok(pickup.distance > 0 && pickup.distance < length && Math.abs(pickup.x) < ROAD_LIMIT);
        assert.equal(pickup.altitude > 0, pickup.tier === 'tank' || pickup.tier === 'overcharge');
        const section = sections.find(s => pickup.distance >= s.from && pickup.distance < s.to);
        assert.ok(!(section?.type === 'gap' && pickup.altitude === 0), `${id} ground pickup over a gap`);
        assert.ok(!(section?.type === 'tunnel' && pickup.altitude > 0), `${id} air pickup in a tunnel`);
      }
    }
  } finally {
    Math.random = random;
  }
  assert.notDeepEqual(createRace('coast').pickups, createRace('neon').pickups);
});

test('passing through each pickup tier adds its nitro amount once; a pickup in another lane is missed', () => {
  const amounts = { cell: 0.25, can: 0.5, tank: 1, overcharge: NITRO_MAX };
  for (const [tier, amount] of Object.entries(amounts)) {
    const race = racing();
    const altitude = tier === 'tank' || tier === 'overcharge' ? 5 : 0;
    Object.assign(race.player, { speed: 60, altitude });
    race.pickups = [{ distance: race.player.distance + 0.5, x: race.player.x, altitude, tier }];
    stepRace(race, {}, 1 / 60);
    assert.equal(race.player.nitro, amount, tier);
    stepRace(race, {}, 1 / 60);
    assert.equal(race.player.nitro, amount, tier);
  }
  const race = racing();
  race.player.speed = 60;
  race.pickups = [{ distance: race.player.distance + 0.5, x: race.player.x + 5, altitude: 0, tier: 'can' }];
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.nitro, 0);
  Object.assign(race.player, { nitro: 1.5, fuel: 50, altitude: 5 });
  race.pickups = [{ distance: race.player.distance + 0.5, x: race.player.x, altitude: 5, tier: 'overcharge' }];
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.nitro, NITRO_MAX);
  assert.equal(race.player.fuel, 50); // overcharge tops up only, nothing converted
});

test('under one full charge NITRO cannot fire', () => {
  const race = racing();
  Object.assign(race.player, { speed: 60, nitro: 0.99 });
  press(race, { throttle: true });
  assert.equal(race.player.nitroTime, 0);
  assert.equal(race.player.nitro, 0.99);
  assert.equal(race.player.nitroUses, 0);
});

test('NITRO spends one charge for 2.5 s with a MAX_SPEED + 30 cap and much stronger acceleration', () => {
  const plain = racing();
  const nitro = racing();
  for (const race of [plain, nitro]) Object.assign(race.player, { speed: 40, nitro: 1 });
  stepRace(plain, { throttle: true, boost: true }, 1 / 60);
  stepRace(nitro, { throttle: true, nitro: true }, 1 / 60);
  assert.equal(nitro.player.nitro, 0);
  assert.equal(nitro.player.nitroUses, 1);
  assert.ok(nitro.player.speed - 40 > 2 * (plain.player.speed - 40));
  advance(nitro, 2.3, { throttle: true });
  assert.ok(nitro.player.nitroTime > 0);
  assert.ok(nitro.player.speed > MAX_SPEED + 20 && nitro.player.speed <= MAX_SPEED + 30);
  advance(nitro, 0.25, { throttle: true });
  assert.equal(nitro.player.nitroTime, 0);
  const top = nitro.player.speed;
  advance(nitro, 1, { throttle: true });
  assert.ok(nitro.player.speed < top);
});

test('holding NITRO fires once; pressing again extends it by 2 s without stacking speed', () => {
  const race = racing();
  Object.assign(race.player, { speed: MAX_SPEED + 30, nitro: 3 });
  advance(race, 0.5, { throttle: true, nitro: true });
  assert.equal(race.player.nitro, 2);
  stepRace(race, { throttle: true }, 1 / 60); // release
  const remaining = race.player.nitroTime;
  press(race, { throttle: true });
  assert.equal(race.player.nitro, 1);
  assert.ok(Math.abs(race.player.nitroTime - (remaining + 2 - 2 / 60)) < 1e-9);
  assert.equal(race.player.nitroUses, 1);
  advance(race, 1, { throttle: true, boost: true });
  assert.ok(race.player.speed <= MAX_SPEED + 30);
});

test('hitting traffic during NITRO keeps 0.7 of the speed instead of 0.45', () => {
  for (const [nitro, retention] of [[1, 0.7], [0, 0.45]]) {
    const race = racing();
    Object.assign(race.player, { speed: 60, nitro });
    stepRace(race, { nitro: true }, 1 / 60);
    const speed = race.player.speed;
    race.traffic = [{ x: race.player.x, distance: race.player.distance + 1, speed: 0 }];
    stepRace(race, {}, 1 / 60);
    assert.equal(race.player.collisions, 1);
    assert.ok(Math.abs(race.player.speed / speed - retention) < 0.02, `retention ${retention}`);
  }
});

test('nitro caps at 3 charges: a 0.5 pickup at 2.9 fills to 3 and converts 0.4 into 12.8 fuel', () => {
  assert.equal(NITRO_MAX, 3);
  const race = racing();
  Object.assign(race.player, { speed: 60, nitro: 2.9, fuel: 50 });
  race.pickups = [{ distance: race.player.distance + 0.5, x: race.player.x, altitude: 0, tier: 'can' }];
  stepRace(race, { boost: true }, 1 / 60);
  assert.equal(race.player.nitro, 3);
  assert.ok(Math.abs(race.player.fuel - (50 - 10 / 60 + 0.4 * 32)) < 1e-9);
  race.player.fuel = 95;
  race.pickups = [{ distance: race.player.distance + 0.5, x: race.player.x, altitude: 0, tier: 'tank' }];
  stepRace(race, { boost: true }, 1 / 60);
  assert.equal(race.player.fuel, 100);
});

test('using one charge takes 3 to 2 and three presses chain into one 6.5 s burst via the extend rule', () => {
  const race = racing();
  Object.assign(race.player, { speed: 60, nitro: 3 });
  press(race);
  assert.equal(race.player.nitro, 2);
  press(race);
  press(race);
  assert.equal(race.player.nitro, 0);
  assert.ok(Math.abs(race.player.nitroTime - (2.5 + 2 + 2 - 6 / 60)) < 1e-9);
});

test('the race result records NITRO activations and the longest near-miss combo', () => {
  const race = racing();
  Object.assign(race.player, { nitro: 1, combo: 0 });
  press(race);
  race.player.speed = 70;
  const traffic = { x: race.player.x + 2.5, distance: race.player.distance - 4, speed: 20 };
  race.traffic = [traffic];
  stepRace(race, {}, 1 / 60);
  traffic.distance = race.player.distance - 4;
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.combo, 2);
  race.traffic = [{ x: race.player.x, distance: race.player.distance + 1, speed: 0 }];
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.combo, 0);
  race.traffic = [];
  advance(race, 1.6, { throttle: true }); // wait out the contact cooldown
  race.traffic = [{ x: race.player.x + 2.5, distance: race.player.distance - 4, speed: 20 }];
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.player.combo, 1);
  race.traffic = [];
  race.rivals.forEach(rival => { rival.distance = 100; });
  Object.assign(race.player, { distance: race.length - 1, speed: 80 });
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.result.nitroUses, 1);
  assert.equal(race.result.longestCombo, 2);
  assert.equal(createRace().player.longestCombo, 0);
});

function driftingRace(speed = 80) {
  const race = racing();
  Object.assign(race.player, { speed, x: 0 });
  return race;
}
const DRIFT = { brake: true, steer: 0.1 };

test('no drift below 45 m/s: brake plus steer hard-brakes', () => {
  const race = driftingRace(DRIFT_MIN_SPEED - 1);
  advance(race, 0.5, DRIFT);
  assert.equal(race.player.drift, null);
  assert.ok(race.player.speed < 44 - 15);
});

test('brake plus steer at speed drifts, bleeding only 3 m/s^2, with the steer direction', () => {
  const race = driftingRace();
  assert.equal(race.player.drift, null);
  advance(race, 0.5, { brake: true, steer: -0.1 });
  assert.equal(race.player.drift.dir, -1);
  assert.ok(Math.abs(race.player.drift.time - 0.5) < 0.02);
  assert.ok(Math.abs(race.player.speed - (80 - 1.5)) < 0.1);
});

test('the pad input shape (brake + analog steer, nothing else) drifts; brake alone and steer alone do not', () => {
  const pad = { throttle: false, brake: true, steer: 0.5, fly: false, boost: false, nitro: false };
  let race = driftingRace();
  advance(race, 0.3, pad);
  assert.equal(race.player.drift?.dir, 1);
  race = driftingRace();
  advance(race, 0.3, { brake: true });
  assert.equal(race.player.drift, null);
  advance(race, 0.3, { steer: 0.1 });
  assert.equal(race.player.drift, null);
});

test('releasing a drift pays nitro and a mini boost by the highest time threshold reached', () => {
  const rewards = [[0.95, 0, 0], [1.05, 0.15, 0.5], [2.05, 0.3, 0.8], [3.05, 0.5, 1.2]];
  for (const [time, nitro, boost] of rewards) {
    const race = driftingRace();
    advance(race, time, DRIFT);
    assert.equal(race.player.nitro, 0, 'nothing is paid while drifting');
    stepRace(race, {}, 1 / 60);
    assert.equal(race.player.drift, null);
    assert.ok(Math.abs(race.player.nitro - nitro) < 1e-9, `nitro at ${time}s`);
    assert.ok(Math.abs(race.player.miniBoost - boost) < 0.05, `mini boost at ${time}s`);
  }
});

test('drift nitro counts toward the cap and the overflow becomes fuel', () => {
  const race = driftingRace();
  Object.assign(race.player, { nitro: 2.9, fuel: 50 });
  advance(race, 3.05, DRIFT);
  const fuel = race.player.fuel;
  stepRace(race, {}, 1 / 60);
  assert.equal(race.player.nitro, NITRO_MAX);
  assert.ok(race.player.fuel - fuel > 10); // 0.4 overflow x 32 fuel
});

test('the mini boost lifts the speed cap past MAX_SPEED without burning fuel', () => {
  const race = driftingRace();
  advance(race, 3.05, DRIFT);
  race.player.fuel = 50;
  advance(race, 0.9, { throttle: true });
  assert.ok(race.player.speed > MAX_SPEED);
  assert.ok(race.player.fuel >= 50);
  advance(race, 2, { throttle: true });
  assert.ok(race.player.miniBoost === 0 && race.player.speed <= MAX_SPEED + 1e-9);
});

test('hitting a car or a barrier mid-drift cancels the build-up and loses the reward', () => {
  for (const crash of [
    race => { race.traffic = [{ x: race.player.x, distance: race.player.distance + 1, speed: 0 }]; },
    race => { Object.assign(race.player, { x: ROAD_LIMIT, steering: 1 }); },
  ]) {
    const race = driftingRace(100);
    advance(race, 2.05, DRIFT);
    assert.ok(race.player.drift);
    crash(race);
    stepRace(race, { brake: true, steer: 1 }, 1 / 60); // full steer: a rail hit is a barrier crash, not a scrape
    assert.equal(race.player.collisions, 1);
    assert.equal(race.player.drift, null);
    race.traffic = [];
    Object.assign(race.player, { speed: 80, cooldown: 0 });
    stepRace(race, {}, 1 / 60);
    assert.equal(race.player.nitro, 0);
    assert.equal(race.player.miniBoost, 0);
  }
});

test('no drift in the air, and taking off mid-drift cancels it', () => {
  let race = driftingRace();
  Object.assign(race.player, { altitude: 3, verticalSpeed: 0 });
  advance(race, 0.3, DRIFT);
  assert.equal(race.player.drift, null);

  race = driftingRace();
  advance(race, 2.05, DRIFT);
  assert.ok(race.player.drift);
  advance(race, 0.3, { ...DRIFT, fly: true });
  assert.ok(race.player.altitude > 0);
  assert.equal(race.player.drift, null);
  advance(race, 4, {});
  assert.equal(race.player.altitude, 0);
  assert.equal(race.player.nitro, 0);
});

test('near-miss combo points are doubled while drifting', () => {
  for (const [input, combo] of [[{ throttle: true }, 1], [DRIFT, 2]]) {
    const race = driftingRace(70);
    race.rivals = [];
    race.traffic = [{ x: race.player.x + 2.5, distance: -4, speed: 20 }];
    race.traffic[0].distance = race.player.distance - 4;
    stepRace(race, input, 1 / 60);
    assert.equal(race.player.combo, combo);
  }
});

// ---- rings ----
// `unreachable` adds a far-off ring to group 0 so a single test ring never completes a PERFECT LINE by itself.
function ringRace(rings, setup = {}, unreachable = true) {
  const race = racing();
  race.rings = rings.map((ring, i) => ({ distance: 100 + i * 10, x: 0, altitude: 0, radius: RING_RADIUS, type: 'charge', group: 0, ...ring }));
  if (unreachable) race.rings.push({ distance: 4000, x: 0, altitude: 0, radius: RING_RADIUS, type: 'charge', group: 0 });
  Object.assign(race.player, { distance: 99.7, x: 0, speed: 40, ...setup });
  return race;
}

test('rings come only from the track seed: reproducible, ordered, in groups of 3 to 5, and every type appears', () => {
  const random = Math.random;
  Math.random = () => { throw new Error('Math.random used'); };
  try {
    const types = new Set();
    for (const id of TRACK_IDS) {
      const { rings, length } = createRace(id);
      assert.deepEqual(rings, createRace(id).rings);
      assert.ok(rings.length >= 7, id);
      rings.forEach((ring, i) => {
        assert.deepEqual(Object.keys(ring), ['distance', 'x', 'altitude', 'radius', 'type', 'group']);
        assert.ok(ring.distance > 0 && ring.distance < length && Math.abs(ring.x) < ROAD_LIMIT && ring.altitude >= 0 && ring.altitude <= 12);
        assert.ok(i === 0 || ring.distance > rings[i - 1].distance);
        assert.equal(ring.radius, ring.type === 'risk' ? RISK_RING_RADIUS : RING_RADIUS);
        types.add(ring.type);
      });
      const sizes = Object.values(Object.groupBy(rings, ring => ring.group)).map(group => group.length);
      assert.ok(sizes.every(size => size >= 3 && size <= 5), `${id} group sizes ${sizes}`);
      assert.deepEqual([...new Set(rings.map(ring => ring.group))], sizes.map((_, i) => i)); // consecutive group ids
    }
    assert.deepEqual(types, new Set(['charge', 'nitro', 'slipstream', 'risk', 'mystery']));
  } finally {
    Math.random = random;
  }
  assert.notDeepEqual(createRace('coast').rings, createRace('neon').rings);
});

test('coast keeps the original gate positions every 220 m at x 2.5 and altitude 8', () => {
  const { rings } = createRace('coast');
  rings.forEach((ring, i) => {
    assert.equal(ring.distance, (i + 1) * 220);
    assert.equal(ring.x, 2.5);
    assert.equal(ring.altitude, 8);
  });
});

test('a ring counts only when the car passes inside its radius; grazing the edge does not', () => {
  const hit = ringRace([{ type: 'nitro' }]);
  advance(hit, 0.1);
  assert.equal(hit.player.rings, 1);
  assert.equal(hit.player.nitro, 0.5);
  const inside = ringRace([{ type: 'nitro' }], { x: RING_RADIUS - 0.05 });
  advance(inside, 0.1);
  assert.equal(inside.player.rings, 1);
  const graze = ringRace([{ type: 'nitro' }], { x: RING_RADIUS + 0.05 });
  advance(graze, 0.1);
  assert.equal(graze.player.rings, 0);
  assert.equal(graze.player.nitro, 0);
  const low = ringRace([{ type: 'nitro', altitude: 8 }]); // right lane, wrong height
  advance(low, 0.1);
  assert.equal(low.player.rings, 0);
  const again = ringRace([{ type: 'nitro' }]);
  advance(again, 0.5, {}); // a ring is only passed once
  assert.equal(again.player.nitro, 0.5);
});

test('charge, nitro, slipstream and risk rings pay their rewards', () => {
  const charge = ringRace([{ type: 'charge' }]);
  charge.player.fuel = 50;
  advance(charge, 0.1);
  assert.ok(charge.player.fuel >= 70 && charge.player.fuel < 72);
  const full = ringRace([{ type: 'charge' }]);
  full.player.fuel = 95;
  advance(full, 0.1);
  assert.equal(full.player.fuel, 100);
  const overflow = ringRace([{ type: 'nitro' }]);
  overflow.player.nitro = NITRO_MAX;
  overflow.player.fuel = 10;
  advance(overflow, 0.1);
  assert.equal(overflow.player.nitro, NITRO_MAX);
  assert.ok(overflow.player.fuel > 10); // addNitro turns the overflow into fuel
  const slip = ringRace([{ type: 'slipstream' }]);
  advance(slip, 0.1);
  assert.ok(slip.player.miniBoost > 2.8 && slip.player.miniBoost <= 3);
  const risk = ringRace([{ type: 'risk', radius: RISK_RING_RADIUS }]);
  advance(risk, 0.1);
  assert.equal(risk.player.nitro, 1);
  assert.equal(risk.player.score, RISK_SCORE);
});

test('clearing a whole group is a PERFECT LINE worth one extra nitro; missing one breaks it but keeps earned rewards', () => {
  const perfect = ringRace([0, 1, 2].map(() => ({ type: 'nitro' })), {}, false);
  advance(perfect, 1);
  assert.equal(perfect.player.rings, 3);
  assert.equal(perfect.player.perfectLines, 1);
  assert.equal(perfect.player.nitro, 2.5); // 3 x 0.5 + 1 for the line, capped at the 3 charges
  const broken = ringRace([{ type: 'nitro' }, { type: 'nitro', x: 9 }, { type: 'nitro' }], {}, false);
  advance(broken, 1);
  assert.equal(broken.player.rings, 2);
  assert.equal(broken.player.perfectLines, 0);
  assert.equal(broken.player.nitro, 1); // the two rings cleared still paid
});

test('the finished race reports rings, perfect lines and score', () => {
  const race = ringRace([0, 1, 2].map(() => ({ type: 'risk', radius: RISK_RING_RADIUS })), {}, false);
  advance(race, 1);
  Object.assign(race.player, { distance: race.length - 1, speed: 60 });
  advance(race, 0.2);
  assert.equal(race.phase, 'finished');
  assert.equal(race.result.rings, 3);
  assert.equal(race.result.perfectLines, 1);
  assert.equal(race.result.score, 3 * RISK_SCORE);
  assert.equal(createRace().player.rings, 0);
  assert.equal(createRace().player.score, 0);
});

test('mystery rings pick their effect from the seed, never Math.random, and grant exactly that one', () => {
  const random = Math.random;
  Math.random = () => { throw new Error('Math.random used'); };
  try {
    assert.deepEqual(MYSTERY_EFFECTS.slice().sort(), ['freeze', 'ghost', 'magnet', 'shield']);
    const seen = new Set();
    for (let seed = 0; seed < 40; seed++) {
      assert.equal(mysteryEffect(seed, 3), mysteryEffect(seed, 3));
      seen.add(mysteryEffect(seed, 3));
    }
    assert.equal(seen.size, 4);
    for (const effect of MYSTERY_EFFECTS) {
      const seed = Array.from({ length: 200 }, (_, s) => s).find(s => mysteryEffect(s, 0) === effect);
      const race = ringRace([{ type: 'mystery' }]);
      race.seed = seed;
      advance(race, 0.1);
      for (const name of MYSTERY_EFFECTS) assert.equal(race.player.effects[name] > 0, name === effect, `${effect}/${name}`);
    }
  } finally {
    Math.random = random;
  }
});

test('shield absorbs exactly one collision', () => {
  const race = racing();
  Object.assign(race.player, { distance: 100, x: 0, speed: 40 });
  race.player.effects.shield = 10;
  race.traffic = [{ x: 0, distance: 102, speed: 20, color: 0 }];
  advance(race, 0.1);
  assert.equal(race.player.collisions, 0);
  assert.equal(race.player.effects.shield, 0);
  assert.ok(race.player.speed > 38); // no speed lost
  Object.assign(race.player, { distance: 200, cooldown: 0 });
  race.traffic = [{ x: 0, distance: 202, speed: 20, color: 0 }];
  advance(race, 0.1);
  assert.equal(race.player.collisions, 1);
});

test('ghost drives through traffic while it lasts and then wears off', () => {
  const crash = () => {
    const race = racing();
    Object.assign(race.player, { distance: 100, x: 0, speed: 40 });
    race.traffic = [{ x: 0, distance: 102, speed: 20, color: 0 }];
    return race;
  };
  const plain = crash();
  advance(plain, 0.1);
  assert.equal(plain.player.collisions, 1);
  const ghost = crash();
  ghost.player.effects.ghost = 3;
  advance(ghost, 0.1);
  assert.equal(ghost.player.collisions, 0);
  advance(ghost, 3);
  assert.equal(ghost.player.effects.ghost, 0);
});

test('freeze slows the rivals while it lasts', () => {
  const run = freeze => {
    const race = racing();
    race.rivals.forEach(rival => Object.assign(rival, { distance: 500, speed: 60 }));
    race.player.effects.freeze = freeze;
    advance(race, 1);
    return race.rivals[0].distance - 500;
  };
  const frozen = run(2);
  const normal = run(0);
  assert.ok(frozen < normal * 0.6 && frozen > 0, `${frozen} vs ${normal}`);
});

test('magnet pulls nearby pickups into the car, once', () => {
  const run = magnet => {
    const race = racing();
    Object.assign(race.player, { distance: 100, x: 0, speed: 40 });
    race.pickups = [{ distance: 108, x: 7.5, altitude: 0, tier: 'can' }, { distance: 400, x: 0, altitude: 0, tier: 'can' }];
    race.player.effects.magnet = magnet;
    advance(race, 0.5);
    return race;
  };
  const pulled = run(5);
  assert.equal(pulled.player.nitro, 0.5); // the far pickup stays out of range
  advance(pulled, 0.5);
  assert.equal(pulled.player.nitro, 0.5); // and the pulled one is not collected again on crossing
  assert.equal(run(0).player.nitro, 0);
});

// Player at 88 m/s with `lead` 6 m ahead (traffic by default); the lead pulls away slowly so the gap stays in the 4.4-14 m draft window.
function drafting(speed, leadSpeed, kind = 'traffic') {
  const race = racing();
  Object.assign(race, { rivals: [], pickups: [], rings: [] });
  Object.assign(race.player, { distance: 100, x: 2.5, speed });
  const lead = { x: 2.5, distance: 106, speed: leadSpeed, altitude: 0 };
  if (kind === 'rival') race.rivals = [{ ...lead, name: 'NOVA', nitro: 0, nitroTime: 0, finishTime: null }];
  else race.traffic = [lead];
  return race;
}

test('slipstream behind traffic pays +0.25 nitro and +6 speed cap only after the full time', () => {
  const race = drafting(MAX_SPEED, 91);
  advance(race, SLIPSTREAM_TIME - 0.1, { throttle: true });
  assert.equal(race.player.nitro, 0);
  assert.equal(race.player.slipstream.active, false);
  assert.ok(race.player.slipstream.time > 1 && race.player.speed <= MAX_SPEED);
  advance(race, 0.5, { throttle: true });
  assert.equal(race.player.nitro, 0.25);
  assert.equal(race.player.slipstream.active, true);
  assert.ok(race.player.speed > MAX_SPEED + 3 && race.player.speed <= MAX_SPEED + SLIPSTREAM_CAP_BONUS + 1e-9, `${race.player.speed}`);
  advance(race, 0.8, { throttle: true });
  assert.equal(race.player.nitro, 0.25); // once per engagement
});

test('slipstream behind a rival counts too, and leaving the draft re-arms it', () => {
  const race = drafting(70, 70, 'rival');
  const cruise = seconds => { for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) { race.player.speed = race.rivals[0].speed = 70; stepRace(race, {}, 1 / 60); } };
  cruise(SLIPSTREAM_TIME + 0.2);
  assert.equal(race.player.nitro, 0.25);
  race.rivals[0].distance += 100; // break away
  cruise(0.1);
  assert.deepEqual([race.player.slipstream.time, race.player.slipstream.active], [0, false]);
  race.rivals[0].distance = race.player.distance + 6;
  cruise(SLIPSTREAM_TIME + 0.2);
  assert.equal(race.player.nitro, 0.5);
});

test('slipstream needs the same lane and a draft-range gap', () => {
  for (const change of [{ x: -7.5 }, { distance: 125 }, { altitude: 5 }]) {
    const race = drafting(MAX_SPEED, MAX_SPEED);
    Object.assign(race.traffic[0], change);
    advance(race, SLIPSTREAM_TIME + 0.3);
    assert.equal(race.player.nitro, 0, JSON.stringify(change));
  }
});

test('rival nitro fires by personality and respects its charge budget', () => {
  const fresh = () => { const race = racing(); race.player.effects.ghost = 99; return race; };
  const [nova, orbit, apex] = [0, 1, 2];
  const step = race => stepRace(race, {}, 1 / 60);
  const early = fresh();
  step(early);
  assert.deepEqual(early.rivals.map(rival => rival.nitro), [RIVAL_NITRO_CHARGES, RIVAL_NITRO_CHARGES, RIVAL_NITRO_CHARGES]);
  const novaRace = fresh(); // NOVA: steady, fixed schedule
  novaRace.elapsed = RIVAL_NITRO_NOVA_FIRST + 0.1;
  step(novaRace);
  assert.equal(novaRace.rivals[nova].nitro, RIVAL_NITRO_CHARGES - 1);
  assert.ok(novaRace.rivals[orbit].nitro === RIVAL_NITRO_CHARGES || novaRace.rivals[orbit].altitude > 2);
  const orbitRace = fresh(); // ORBIT: only while flying
  orbitRace.elapsed = 0.1;
  step(orbitRace);
  assert.equal(orbitRace.rivals[orbit].nitro, RIVAL_NITRO_CHARGES);
  orbitRace.elapsed = 2.8;
  step(orbitRace); // in the air but too slow: no wasted charge
  assert.equal(orbitRace.rivals[orbit].nitro, RIVAL_NITRO_CHARGES);
  orbitRace.rivals[orbit].speed = 73;
  step(orbitRace);
  step(orbitRace);
  assert.ok(orbitRace.rivals[orbit].altitude > 2);
  assert.equal(orbitRace.rivals[orbit].nitro, RIVAL_NITRO_CHARGES - 1);
  advance(orbitRace, RIVAL_NITRO_TIME + 0.2); // still airborne when it ends (hop is ~2.7 s) but the same hop never fires twice
  assert.equal(orbitRace.rivals[orbit].nitro, RIVAL_NITRO_CHARGES - 1);
  const apexRace = fresh(); // APEX: saves it for the last quarter
  apexRace.rivals[apex].distance = RACE_LENGTH * 0.7;
  step(apexRace);
  assert.equal(apexRace.rivals[apex].nitro, RIVAL_NITRO_CHARGES);
  apexRace.rivals[apex].distance = RACE_LENGTH * 0.76;
  apexRace.rivals[apex].speed = 76;
  const before = apexRace.rivals[apex].speed;
  advance(apexRace, 2);
  assert.ok(apexRace.rivals[apex].speed > 76 + 3 && apexRace.rivals[apex].speed <= 76 + RIVAL_NITRO_BONUS + 1e-9, `${before} -> ${apexRace.rivals[apex].speed}`);
  advance(apexRace, 8); // both charges burn, then nothing is left
  assert.equal(apexRace.rivals[apex].nitro, 0);
  assert.equal(apexRace.rivals[apex].nitroTime, 0);
  assert.ok(apexRace.rivals[apex].speed <= 76 + 1e-9);
});

test('rubber-banding stays within a few percent: leaders ease off, stragglers speed up', () => {
  const gain = playerDistance => {
    const race = racing();
    race.player.effects.ghost = 99;
    Object.assign(race.player, { distance: playerDistance, x: 7.5 });
    Object.assign(race.rivals[0], { distance: 1000, speed: 60 });
    advance(race, 1);
    return race.rivals[0].distance - 1000;
  };
  const neutral = gain(1000);
  const ahead = gain(0); // rival 1000 m ahead of the player
  const behind = gain(2000); // rival 1000 m behind
  assert.ok(ahead < neutral && ahead >= neutral * (1 - RUBBER_BAND_MAX) - 1e-9, `${ahead} vs ${neutral}`);
  assert.ok(behind > neutral, `${behind} vs ${neutral}`);
  assert.ok(behind / ahead <= (1 + RUBBER_BAND_MAX) / (1 - RUBBER_BAND_MAX) + 1e-9, `${behind} vs ${ahead}`); // neutral drifts into the band itself once it pulls 50 m clear
  assert.ok(RUBBER_BAND_MAX <= 0.06);
});
