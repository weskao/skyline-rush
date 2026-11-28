import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, requestRaceReset, RACE_TRACKS, ROAD_LIMIT, STEER_RAMP } from '../src/game.js';
import { COURSE_TRACKS, isModeTrack } from '../src/race-tracks.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { cornerRate, roadBend, roadDrift, turnAuthority } from '../src/corner-force.ts';
import { steerToward } from '../scripts/pickup-economy.mjs';

// Kart handling (owner, 2026-11-28): steering turns the nose and the car runs along it. Released, the nose keeps its
// direction, so a bend turns the road away and the car meets the rail. AUTO is an automatic throttle only.
const TRACKS = [...Object.keys(RACE_TRACKS), ...Object.keys(COURSE_TRACKS), CIRCUIT_ID];
const modeOf = id => id === CIRCUIT_ID ? 'circuit' : 'time';
const AUTO = { throttle: true, laneAssist: true };
const HANDS_OFF = { throttle: true };
/** Metres into Neon's 1 km straight from 5996 m: no bend and no section (crosswind, tunnel) acts. */
const NEON_STRAIGHT = 6300;

function racing(id, mode = modeOf(id), hz = 60) {
  const race = createRace(id, { mode }); startRace(race);
  while (race.phase !== 'racing') stepRace(race, {}, 1 / hz);
  Object.assign(race, { traffic: [], rivals: [], pickups: [], rings: [] });
  race.hazards = [];
  return race;
}

/** A full start-to-finish run; lateral deviation is sampled only while no contact or recovery has moved the car. */
function drive(id, input, { lane = 2.5, hz = 60 } = {}) {
  const race = racing(id, modeOf(id), hz), car = race.player, dt = 1 / hz;
  car.x = lane;
  const run = { dev: 0, hard: 0, scrapes: 0 };
  for (let steps = 0; race.phase === 'racing' && steps < hz * 900; steps++) {
    const rail = car.railContactSide, scrape = car.scrape;
    stepRace(race, typeof input === 'function' ? input(car, race) : input, dt);
    if (!rail && car.railContactSide) run.hard++;
    if (car.scrape !== scrape) run.scrapes++;
    if (!car.recovery && car.cooldown === 0) run.dev = Math.max(run.dev, Math.abs(car.x - lane));
  }
  run.finished = race.phase !== 'racing';
  return run;
}

/** A driver holding `lane`: it cancels the bend's turn, then aims the nose at its lane, as a player leans and counter-steers. */
const keeper = (lane, nitro) => (car, race) => {
  if (nitro) car.nitroTime = 2;
  return { throttle: true, steer: steerToward(race, car, Math.max(-.1, Math.min(.1, (lane - car.x) * .04))) };
};

/** The distance of the sharpest bend on a road, by its turn per metre. */
function sharpestAt(id, to = RACE_TRACKS[id]?.length ?? 3000) {
  let at = 0;
  for (let d = 0; d < to; d += 4) if (Math.abs(roadBend(id, d)) > Math.abs(roadBend(id, at))) at = d;
  return at;
}

test('full lock out-turns every bend at NITRO speed, and an authored kink turns the nose no faster than that cap', () => {
  for (const id of [...Object.keys(RACE_TRACKS), ...Object.keys(COURSE_TRACKS).filter(i => !createRace(i).course), CIRCUIT_ID]) {
    const length = RACE_TRACKS[id]?.length ?? createRace(id, { mode: modeOf(id) }).length;
    for (let d = 0; d < length; d += 4) {
      assert.ok(Math.abs(roadBend(id, d)) * 118 <= turnAuthority(118) + 1e-9, `${id} ${d} m: ${roadBend(id, d)} rad/m`);
    }
  }
  // Stormline's street corner turns the road 115 degrees within 4 m: the nose meets a capped bend, not the kink.
  const race = racing('stormline-megacity'), car = race.player;
  Object.assign(car, { distance: 11370, speed: 88, x: 0, steering: 0, heading: 0 });
  while (car.distance < 11400 && !car.railContactSide && !car.scrape) {
    const from = car.heading;
    car.speed = 88; stepRace(race, HANDS_OFF, 1 / 60);
    assert.ok(Math.abs(car.heading - from) <= 88 / 60 / 60 + 1e-12, `${car.distance.toFixed(1)} m: the nose turned ${car.heading - from} rad in a step`);
  }
});

test('released on a straight the nose keeps its direction and the car runs along it, AUTO on or off', () => {
  assert.ok(!racing('neon').sections.some(s => s.to > NEON_STRAIGHT - 50 && s.from < NEON_STRAIGHT + 400), 'no section acts there');
  for (const hz of [30, 60, 120]) for (const input of [AUTO, HANDS_OFF]) {
    const race = racing('neon', 'time', hz), car = race.player;
    Object.assign(car, { distance: NEON_STRAIGHT, speed: 88, x: -6, steering: 0, heading: .08 });
    for (let i = 0; i < hz / 2; i++) { car.speed = 88; stepRace(race, input, 1 / hz); }
    assert.equal(car.heading, .08, `${hz} Hz: the nose kept its direction`);
    assert.ok(Math.abs(car.x - (-6 + 88 * Math.sin(.08) / 2)) < .01, `${hz} Hz: ran along the nose to ${car.x}`);
  }
  const race = racing('neon'), car = race.player;
  Object.assign(car, { distance: NEON_STRAIGHT, speed: 88, x: 2, steering: 0, heading: 0 });
  for (let i = 0; i < 120; i++) { car.speed = 88; stepRace(race, AUTO, 1 / 60); }
  assert.equal(car.x, 2, 'straight on, it never moves sideways');
});

test('released in a bend the road turns away from the nose at speed x curvature, even on a 5 km curve', () => {
  const race = racing(CIRCUIT_ID), car = race.player;
  Object.assign(car, { distance: 500, speed: 88, x: 0, steering: 0, heading: 0 });
  let expected = 0;
  for (let i = 0; i < 30; i++) { car.speed = 88; expected += cornerRate(race, car) / 60; stepRace(race, HANDS_OFF, 1 / 60); }
  assert.ok(Math.abs(expected) > .1, `the circuit bend turned the road: ${expected}`);
  assert.ok(Math.abs(car.heading - expected) < 1e-9, `the nose kept its world direction: ${car.heading} vs ${expected}`);
  // Tokyo's opening kilometre reads straight but curves gently: a released car still drifts off line there.
  const tokyo = racing('tokyo'), released = tokyo.player;
  Object.assign(released, { distance: 0, speed: 88, x: 0, steering: 0, heading: 0 });
  while (released.distance < 800 && !released.railContactSide && !released.scrape) { released.speed = 88; stepRace(tokyo, HANDS_OFF, 1 / 60); }
  assert.ok(released.heading !== 0 || released.railContactSide || released.scrape, 'a gentle curve is still a curve');
});

test('steering turns the nose, not the car: no sideways shift, and released the car keeps going where it points', () => {
  const race = racing('neon'), car = race.player;
  Object.assign(car, { distance: NEON_STRAIGHT, speed: 88, x: -8, steering: 0, heading: 0 });
  stepRace(race, { throttle: true, steer: 1 }, 1 / 60);
  const turned = car.heading;
  assert.ok(turned > 0, 'the nose turned right');
  assert.ok(Math.abs(car.x + 8 - 88 * Math.sin(turned / 2) / 60) < 1e-12, `moved only along the nose: ${car.x}`);
  for (let i = 0; i < 5; i++) stepRace(race, { throttle: true, steer: 1 }, 1 / 60);
  while (car.steering > 0) stepRace(race, HANDS_OFF, 1 / 60);
  const held = car.heading, x = car.x;
  for (let i = 0; i < 10; i++) stepRace(race, HANDS_OFF, 1 / 60);
  assert.equal(car.heading, held, 'released, the nose holds its angle');
  assert.ok(car.x > x + .5, `and the car keeps running right: ${x} -> ${car.x}`);
});

test('counter-steer straightens the nose; a lane change ends only when the driver steers back', () => {
  const race = racing('neon'), car = race.player;
  Object.assign(car, { distance: NEON_STRAIGHT, speed: 88, x: -5, steering: 0, heading: 0 });
  for (let i = 0; i < 10; i++) stepRace(race, { throttle: true, steer: 1 }, 1 / 60);
  for (let i = 0; i < 120 && (car.heading > 0 || car.steering > 0); i++) {
    stepRace(race, car.heading > .002 ? { throttle: true, steer: -1 } : HANDS_OFF, 1 / 60);
  }
  assert.ok(Math.abs(car.heading) < .03, `the nose came back: ${car.heading}`);
  assert.ok(car.x > -5, `the car changed lane: ${car.x}`);
});

test('holding the lock the bend needs keeps the nose on the road and the car in its lane', () => {
  const race = racing(CIRCUIT_ID), car = race.player;
  Object.assign(car, { distance: 500, speed: 88, x: 0, steering: 0, heading: 0 });
  for (let i = 0; i < 120; i++) {
    car.speed = 88;
    stepRace(race, { throttle: true, steer: -cornerRate(race, car) / turnAuthority(88) }, 1 / 60);
  }
  assert.ok(Math.abs(car.x) < .5, `held its lane: ${car.x}`);
  assert.ok(Math.abs(car.heading) < .03, `nose stayed on the road: ${car.heading}`);
});

test('a released car runs nose-first into the outside rail of the sharpest Coast bend, AUTO on or off', () => {
  const sharpest = sharpestAt('coast', 3000), out = -Math.sign(roadBend('coast', sharpest));
  for (const input of [AUTO, HANDS_OFF]) {
    const race = racing('coast'), car = race.player;
    Object.assign(car, { distance: sharpest - 40, speed: 88, x: 0, steering: 0, heading: 0 });
    let steps = 0;
    for (; steps < 240 && !car.scrape && !car.railContactSide; steps++) { car.speed = 88; stepRace(race, input, 1 / 60); }
    assert.ok(steps < 90, `reached the rail in ${(steps / 60).toFixed(2)} s`);
    assert.ok(car.railContactSide === Math.sign(car.x) && Math.sign(car.x) === out, 'the outside rail, hit hard');
    assert.equal(car.heading, 0, 'the rail lines the nose up with the road');
  }
});

// Owner, 2026-11-28: AUTO is an automatic throttle only. It never holds a lane, corners or steers off a rail.
test('AUTO changes only the throttle: the same lateral path as AUTO off through a bend, a rail hit, steering, a drift and flight', () => {
  const cases = [['released', {}, {}], ['steering', { steer: .5 }, {}], ['drifting', { brake: true, steer: -1 }, {}], ['flying', {}, { altitude: 3 }]];
  for (const hz of [30, 60, 120]) for (const [name, extra, state] of cases) {
    const [auto, manual] = [AUTO, HANDS_OFF].map(input => {
      const race = racing(CIRCUIT_ID, 'circuit', hz), car = race.player, path = [];
      Object.assign(car, { distance: 500, speed: 88, x: 0, steering: 0, ...state });
      for (let i = 0; i < 4 * hz; i++) {
        car.speed = 88;
        stepRace(race, { ...input, ...extra }, 1 / hz);
        path.push([car.x, car.heading, car.steering]);
      }
      return path;
    });
    assert.deepEqual(auto, manual, `${name} at ${hz} Hz`);
  }
});

test('a released car meets the circuit rail at the same moment at 30, 60 and 120 FPS', () => {
  const contactAt = hz => {
    const race = racing(CIRCUIT_ID, 'circuit', hz), car = race.player;
    Object.assign(car, { distance: 500, speed: 88, x: 0, steering: 0, heading: 0 });
    let i = 0;
    for (; i < 6 * hz && !car.railContactSide && !car.scrape; i++) { car.speed = 88; stepRace(race, AUTO, 1 / hz); }
    return i / hz;
  };
  const reference = contactAt(60);
  assert.ok(reference < 2, `AUTO hit the rail in the circuit bend after ${reference} s`);
  for (const hz of [30, 120]) assert.ok(Math.abs(contactAt(hz) - reference) <= 1 / 30, `${hz} FPS: ${contactAt(hz)} s vs ${reference} s`);
});

test('every track, no steering: runs into the rail and still finishes', () => {
  for (const id of TRACKS) {
    const run = drive(id, HANDS_OFF);
    assert.ok(run.finished, `${id}: did not finish`);
    assert.ok(run.dev >= 2.5, `${id}: stayed in lane, deviation ${run.dev.toFixed(2)} m`);
  }
});

// Full lock out-turns the sharpest bend, but a chicane that flips it within a STEER_RAMP (Frostbite's iced S at 3.7 km,
// Dune's at 9.5 km) still swings a turning-in driver up to 2.8 m: within its lane, never the rail.
test('a steering driver holds its lane through every corner at 88 m/s and at NITRO speed', () => {
  for (const id of TRACKS) for (const lane of [-2.5, 2.5]) for (const nitro of [false, true]) {
    const run = drive(id, keeper(lane, nitro), { lane });
    assert.ok(run.finished, `${id}: did not finish`);
    assert.ok(run.dev < 3, `${id} lane ${lane} nitro ${nitro}: deviation ${run.dev.toFixed(2)} m`);
    assert.equal(run.hard, 0, `${id} lane ${lane} nitro ${nitro}: hard rail hits`);
  }
});

/** Released into the rail, carried there by the nose's `heading`: steep hits hard, shallow scrapes. Then `seconds` hands-off. */
function railContact(trackId, distance, x, heading, input, seconds, hz = 60) {
  const race = racing(trackId, modeOf(trackId), hz), car = race.player, path = [];
  Object.assign(car, { distance, speed: 88, x, steering: 0, heading });
  for (let i = 0; i < 2 && !car.railContactSide && !car.scrape; i++) stepRace(race, input, 1 / hz);
  const hit = { hard: car.railContactSide !== 0 && !car.scrape, scrape: car.scrape, x: car.x, speed: car.speed, distance: car.distance, collisions: car.collisions };
  for (let i = 0; i < seconds * hz; i++) {
    stepRace(race, input, 1 / hz);
    path.push({ x: car.x, steering: car.steering, heading: car.heading, speed: car.speed, distance: car.distance });
  }
  return { car, hit, path };
}

// Owner, 2026-11-28: after a rail hit the nose lines up with the road, the car ends about 1 m inside the rail and
// holds that lane. Nothing steers it back toward the centre; AUTO keeps the throttle on.
test('a rail hit on a straight lines the nose up and leaves the car about 1 m inside the rail, holding that lane', () => {
  const finalX = {};
  for (const hz of [30, 60, 120]) for (const input of [AUTO, HANDS_OFF]) for (const [kind, heading, kept] of [['hard', .15, .75], ['scrape', .03, .92]]) {
    const { car, hit, path } = railContact('neon', NEON_STRAIGHT, ROAD_LIMIT - .01, heading, input, 3, hz), label = `${kind} at ${hz} Hz, AUTO ${!!input.laneAssist}`;
    assert.equal(hit.hard, kind === 'hard', `${label}: judged by impact angle`);
    assert.ok(kind === 'hard' || hit.scrape, `${label}: scraped`);
    assert.ok(Math.abs(hit.speed / 88 - kept) < .02, `${label}: speed kept ${(hit.speed / 88).toFixed(3)}`);
    assert.ok(hit.x > ROAD_LIMIT - 1.3 && hit.x < ROAD_LIMIT - .7, `${label}: ${(ROAD_LIMIT - hit.x).toFixed(2)} m inside the rail`);
    assert.ok(path.every(p => p.x === hit.x && p.steering === 0 && p.heading === 0), `${label}: held its lane, nose on the road`);
    assert.equal(car.collisions, hit.collisions, `${label}: no repeated hit`);
    assert.equal(car.scrape, hit.scrape, `${label}: no repeated scrape`);
    assert.ok(path.at(-1).distance - hit.distance > 3 * 50 && path.at(-1).speed >= hit.speed, `${label}: kept going forward`);
    finalX[`${kind} ${!!input.laneAssist}`] ??= hit.x;
    assert.ok(Math.abs(hit.x - finalX[`${kind} ${!!input.laneAssist}`]) < .05, `${label}: same lane at every frame rate`);
  }
});

test('in a bend a rail contact is one hit: the car is never shoved back in or steered to the centre, AUTO on or off', () => {
  for (const input of [AUTO, HANDS_OFF]) for (const [kind, x, heading] of [['from the centre', 0, 0], ['a scrape', -(ROAD_LIMIT - .01), -.03]]) {
    const race = racing(CIRCUIT_ID), car = race.player, label = `${kind}, AUTO ${!!input.laneAssist}`;
    Object.assign(car, { distance: 500, speed: 88, x, steering: 0, heading });
    let contacts = 0, contactX = null, previous = null;
    for (let i = 0; i < 10 * 60; i++) {
      const rail = car.railContactSide, scrape = car.scrape;
      stepRace(race, input, 1 / 60);
      const hit = (!rail && car.railContactSide) || car.scrape !== scrape;
      if (hit) contacts++;
      // The circuit bends right, so outward is -x: after the contact the car may only hold or move outward.
      if (contactX !== null && !hit) assert.ok(car.x <= previous + 1e-9, `${label}: moved inward at ${i}: ${previous} -> ${car.x}`);
      if (hit) contactX ??= car.x;
      previous = car.x;
      assert.equal(car.steering, 0, `${label}: nothing steered`);
    }
    assert.equal(contacts, 1, `${label}: one contact, not a clamp -> shove loop`);
    assert.ok(car.speed > 50, `${label}: never stopped: ${car.speed}`);
  }
});

test('AUTO no longer centres a released car on a straight', () => {
  const race = racing('neon');
  Object.assign(race.player, { distance: NEON_STRAIGHT, speed: 40, x: 3.6 });
  for (let i = 0; i < 60; i++) stepRace(race, AUTO, 1 / 60);
  assert.equal(race.player.x, 3.6);
});

// A flying car keeps its direction too, so taking off never skips a corner (owner, 2026-11-25).
test('the road turns away from a flying nose at the full rate, and not at all through tutorial practice', () => {
  const race = racing(CIRCUIT_ID), car = { ...race.player, distance: 500, speed: 88, altitude: 0, cooldown: 0 };
  const ground = cornerRate(race, car);
  assert.ok(ground !== 0);
  assert.equal(cornerRate(race, { ...car, altitude: 3 }), ground);
  race.endless = { chunk: 0, milestones: 0, practice: true };
  assert.ok(cornerRate(race, car) === 0);
});

test('the heading clears when the car is reset', () => {
  const race = racing(CIRCUIT_ID), car = race.player;
  Object.assign(car, { distance: 500, speed: 88, x: 0 });
  for (let i = 0; i < 30; i++) stepRace(race, HANDS_OFF, 1 / 60);
  assert.ok(Math.abs(car.heading) > .01, `built ${car.heading}`);
  assert.ok(requestRaceReset(race));
  assert.equal(car.heading, 0, 'a reset car faces down the road');
});

test('a car recovering from a hit is not turned back into what it hit', () => {
  const step = setup => {
    const race = racing(CIRCUIT_ID), car = race.player;
    Object.assign(car, { distance: 500, speed: 88, x: 0, steering: 0, heading: 0, cooldown: 0 });
    setup(car, race);
    stepRace(race, HANDS_OFF, 1 / 60);
    return car.heading;
  };
  assert.equal(step((car, race) => { car.cooldown = 1.5; car.impact = { kind: 'barrier', time: race.elapsed }; }), 0, 'no road turn during a knock');
  assert.notEqual(step(car => { car.cooldown = 1; }), 0, 'a cooldown with no fresh impact (shield block) keeps it');
});

// Pinning the heading through the 1.5 s grace took the steering away after every hit: a car pressed against a side car
// could not steer, then met it again as a second impact once the grace ended.
test('a hit lines the nose up with the road, and steering turns it through the grace', () => {
  const race = racing('coast'), car = race.player; // Coast's opening straight
  Object.assign(car, { distance: 120, speed: 60, x: 0, heading: .2, cooldown: 0 });
  race.traffic = [{ x: .5, homeX: .5, distance: 122, speed: 20, cruise: 20, altitude: 0, cooldown: 0, laneShift: 0 }];
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(car.collisions, 1);
  assert.equal(car.heading, 0, 'the hit lines the nose up');
  race.traffic = [];
  for (let i = 0; i < 30; i++) stepRace(race, { throttle: true, steer: 1 }, 1 / 60);
  assert.ok(car.cooldown > 0 && car.heading > .3, `still in the grace (${car.cooldown}), the nose turned to ${car.heading}`);
});

test('shortcut corridors and spans keep their authored line', () => {
  let checked = 0;
  for (const id of TRACKS) {
    for (const section of racing(id).sections.filter(s => s.type === 'shortcut')) {
      const race = racing(id);
      if (race.course) continue; // graph shortcuts are their own edges
      const x = section.x ?? 0, altitude = Math.max(0, (section.altitude ?? 0) - 2);
      Object.assign(race.player, { distance: (section.from + section.to) / 2, speed: 88, x, altitude, verticalSpeed: 0, span: !!section.span });
      stepRace(race, HANDS_OFF, 1 / 60);
      if (race.player.inShortcut) { checked++; assert.equal(race.player.x, x, `${id} @${section.from}`); }
    }
  }
  assert.ok(checked > 0, 'no corridor was exercised');
});

test('a released car slides the same per second at 30, 60 and 120 FPS', () => {
  const travel = hz => {
    const race = racing(CIRCUIT_ID, 'circuit', hz);
    Object.assign(race.player, { distance: 500, speed: 88, x: 0, heading: 0 });
    for (let i = 0; i < hz / 2; i++) stepRace(race, HANDS_OFF, 1 / hz);
    return race.player.x;
  };
  const reference = travel(60);
  assert.ok(Math.abs(reference) > 1, `slid ${reference}`);
  for (const hz of [30, 120]) assert.ok(Math.abs(travel(hz) - reference) < .1, `${hz} FPS: ${travel(hz)} vs ${reference}`);
});

test('the heading never exceeds its cap, and a diagonal car covers less road than its speed', () => {
  const race = racing('neon'), car = race.player;
  Object.assign(car, { distance: NEON_STRAIGHT, speed: 88, x: -ROAD_LIMIT, steering: 0, heading: 0 });
  let max = 0;
  for (let i = 0; i < 60 && !car.railContactSide; i++) { car.speed = 88; stepRace(race, { throttle: true, steer: 1 }, 1 / 60); max = Math.max(max, car.heading); }
  assert.ok(max > .3 && max <= .5, `heading peaked at ${max}`);
  Object.assign(car, { distance: NEON_STRAIGHT, x: -ROAD_LIMIT, steering: 0, heading: .4, railContactSide: 0, cooldown: 0 });
  const from = car.distance;
  car.speed = 88; stepRace(race, HANDS_OFF, 1 / 60);
  assert.ok(car.distance - from < 88 / 60 * .93, `weaving gains no ground: ${(car.distance - from) * 60} m/s along the road`);
});

test('Endless on every track stays finite on the road, across mirrored runs', () => {
  for (const id of Object.keys(RACE_TRACKS).filter(track => isModeTrack(track, 'endless'))) {
    const race = racing(id, 'endless'), car = race.player;
    car.distance = RACE_TRACKS[id].length * 3 - 400;
    for (let i = 0; i < 900 && race.phase === 'racing'; i++) {
      stepRace(race, AUTO, 1 / 60);
      assert.ok(Number.isFinite(car.x) && Math.abs(car.x) <= ROAD_LIMIT, `${id}: x ${car.x}`);
    }
  }
});

test('roadDrift reads a graph course edge and stays finite', () => {
  const race = createRace('dune-tempest'), travel = race.course.cars.get('YOU').travel;
  travel.currentEdgeId = 'dune-s-bends';
  for (let s = 0; s < 400; s += 4) {
    travel.localS = s;
    const car = { x: 0, speed: 88, altitude: 0, steering: 0, distance: 0, cooldown: 0, heading: 0 };
    assert.ok(Number.isFinite(roadDrift(race, car, undefined, false, 1 / 60)) && Math.abs(car.heading) <= .5);
  }
});

// CI (Node 22, x64) and a Mac (arm64) can disagree in the last bit of Math.sin/cos/atan2; the legacy replay hashes must not.
test('the road bend ignores last-bit trig differences between engines', async () => {
  const samples = async tag => {
    const { roadBend } = await import(`../src/corner-force.ts?${tag}`); // fresh curvature cache per engine
    return Object.keys(RACE_TRACKS).flatMap(id =>
      Array.from({ length: Math.ceil(RACE_TRACKS[id].length / 4) }, (_, i) => roadBend(id, i * 4 + 2)));
  };
  const reference = await samples('reference');
  const real = { sin: Math.sin, cos: Math.cos, atan: Math.atan, atan2: Math.atan2 };
  const nudge = value => value + Math.abs(value) * Number.EPSILON; // about one unit in the last place
  Object.assign(Math, { sin: x => nudge(real.sin(x)), cos: x => nudge(real.cos(x)), atan: x => nudge(real.atan(x)),
    atan2: (y, x) => nudge(real.atan2(y, x)) });
  let other;
  try { other = await samples('other-engine'); } finally { Object.assign(Math, real); }
  const differ = reference.filter((bend, i) => bend !== other[i]).length;
  assert.equal(differ, 0, `${differ} of ${reference.length} samples changed`);
});

test('STEER_RAMP still shapes the first frames of a press', () => {
  const race = racing('neon'), car = race.player;
  Object.assign(car, { distance: NEON_STRAIGHT, speed: 88, x: 0, steering: 0, heading: 0 });
  stepRace(race, { throttle: true, steer: 1 }, 1 / 60);
  assert.ok(Math.abs(car.steering - 1 / 60 / STEER_RAMP) < 1e-12);
});
