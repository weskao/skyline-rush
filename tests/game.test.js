import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, racePosition, RACE_LENGTH, RACE_TRACKS, TUNNEL_CEILING, ROAD_LIMIT, MAX_SPEED, NITRO_MAX } from '../src/game.js';

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
