import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, requestRaceReset, RACE_TRACKS, ROAD_LIMIT, STEER_RAMP } from '../src/game.js';
import { COURSE_TRACKS, isModeTrack } from '../src/race-tracks.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { cornerPush, cornerRate, roadDrift } from '../src/corner-force.ts';
import { forkLateral } from '../src/course-race.ts';

// Cornering needs steering, AUTO on or off: AUTO is an automatic throttle only (owner, 2026-11-28).
const TRACKS = [...Object.keys(RACE_TRACKS), ...Object.keys(COURSE_TRACKS), CIRCUIT_ID];
const modeOf = id => id === CIRCUIT_ID ? 'circuit' : 'time';
const AUTO = { throttle: true, laneAssist: true };
const HANDS_OFF = { throttle: true };

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
  const ground = race.course && new Set(race.course.spec.graph.groundRoute);
  const run = { dev: 0, hard: 0, scrapes: 0, offRoute: 0, maxX: 0, pinned: 0 };
  for (let steps = 0, pin = 0; race.phase === 'racing' && steps < hz * 900; steps++) {
    const rail = car.railContactSide, scrape = car.scrape;
    stepRace(race, typeof input === 'function' ? input(car) : input, dt);
    if (!rail && car.railContactSide) run.hard++;
    if (car.scrape !== scrape) run.scrapes++;
    if (!car.recovery && car.cooldown === 0) run.dev = Math.max(run.dev, Math.abs(car.x - lane));
    run.maxX = Math.max(run.maxX, Math.abs(car.x));
    pin = Math.abs(car.x) >= ROAD_LIMIT - .35 && car.altitude === 0 ? pin + dt : 0;
    run.pinned += pin && dt;
    if (ground && !ground.has(race.course.cars.get('YOU').travel.currentEdgeId)) run.offRoute++;
  }
  run.finished = race.phase !== 'racing';
  return run;
}

const keeper = (lane, nitro) => car => {
  if (nitro) car.nitroTime = 2;
  const authority = Math.max(1, Math.min(9, car.speed * .22));
  // Like a player, it also steers against the nose's slide (`heading`), not only against the lane error.
  const slide = car.speed * Math.sin(car.heading ?? 0);
  return { throttle: true, steer: Math.max(-1, Math.min(1, ((lane - car.x) * 6 - slide) / authority)) };
};

/** One grounded step at full speed on the circuit, whose constant right-hander pushes left everywhere. */
function circuitStep(setup = () => {}, input = HANDS_OFF, hz = 60) {
  const race = racing(CIRCUIT_ID);
  Object.assign(race.player, { distance: 500, speed: 88, x: 0, steering: 0, cooldown: 0 });
  setup(race.player, race);
  const before = race.player.x;
  stepRace(race, input, 1 / hz);
  return race.player.x - before;
}

// Owner brief, 2026-11-24: corners passed themselves. The sharpest bend at 88 m/s now needs two thirds of full lock.
test('the sharpest bend at 88 m/s demands at least 60% steering, and no push ever exceeds 6 m/s', () => {
  for (const id of ['coast', 'neon', 'alpine']) {
    let sharpest = 0;
    for (let d = 0; d < RACE_TRACKS[id].length; d += 4) sharpest = Math.max(sharpest, Math.abs(cornerPush(id, d, 88)));
    assert.ok(sharpest >= .6 * 9, `${id}: sharpest bend pushes only ${sharpest.toFixed(2)} m/s`);
    assert.ok(sharpest <= 6, `${id}: push ${sharpest} beyond the cap`);
  }
});

test('corner plus crosswind never outruns full lock: full lock against both still steers out at 2 m/s', () => {
  let sharpest = 0;
  for (let d = 0; d < RACE_TRACKS.coast.length; d += 4) if (Math.abs(cornerPush('coast', d, 88)) > Math.abs(cornerPush('coast', sharpest, 88))) sharpest = d;
  const dir = Math.sign(cornerPush('coast', sharpest, 88)), dt = 1 / 60;
  const car = { distance: sharpest, x: 0, speed: 118, altitude: 0, steering: -dir, cooldown: 0, section: 'crosswind' };
  const lateral = car.steering * 9 * dt + roadDrift({ trackId: 'coast', elapsed: 0 }, car, { dir }, false, dt);
  assert.ok(Math.abs(lateral + 2 * dir * dt) < 1e-9, `full lock against aligned corner and wind moves ${lateral / dt} m/s`);
});

/** Hands-free from the centre into the sharpest Coast bend at 88 m/s, until the first rail contact. */
function intoSharpest(input = HANDS_OFF) {
  const race = racing('coast'), car = race.player;
  let sharpest = 0;
  for (let d = 0; d < 3000; d += 4) if (Math.abs(cornerPush('coast', d, 88)) > Math.abs(cornerPush('coast', sharpest, 88))) sharpest = d;
  Object.assign(car, { distance: sharpest - 40, speed: 88, x: 0, steering: 0 });
  const path = [];
  for (let i = 0; i < 240 && !car.scrape && !car.railContactSide; i++) {
    car.speed = 88;
    const x = car.x;
    stepRace(race, input, 1 / 60);
    path.push({ heading: car.heading, slide: (car.x - x) * 60 });
  }
  return { car, path, out: Math.sign(cornerPush('coast', sharpest, 88)) };
}

// Owner, 2026-11-25: a released car goes straight on and its nose hits the wall; the corner does not steer it.
test('a released car keeps its nose on its line: the heading grows outward and the slide speeds up until the rail', () => {
  const { car, path, out } = intoSharpest();
  const inBend = path.filter(p => p.heading * out > 0);
  assert.ok(inBend.length > 10, 'the bend turned the road away from the nose');
  for (let i = 1; i < inBend.length; i++) {
    assert.ok(inBend[i].heading * out >= inBend[i - 1].heading * out, `heading never eases back by itself (step ${i})`);
  }
  assert.ok(inBend.at(-1).slide * out > 2 * inBend[5].slide * out, 'the slide accelerates, unlike a constant push');
  assert.ok(path.length < 90, `reached the rail in ${(path.length / 60).toFixed(2)} s`);
  assert.ok(car.railContactSide, 'nose-first at speed is a hard hit, not a scrape');
  assert.equal(car.heading, 0, 'the rail lines the nose up with the road');
});

test('holding the lock the bend needs keeps the nose on the road and the car in its lane', () => {
  const race = racing(CIRCUIT_ID), car = race.player;
  Object.assign(car, { distance: 500, speed: 88, x: 0, steering: 0 });
  for (let i = 0; i < 120; i++) {
    car.speed = 88;
    stepRace(race, { throttle: true, steer: -cornerRate(race, car) / 9 }, 1 / 60);
  }
  assert.ok(Math.abs(car.x) < .5, `held its lane: ${car.x}`);
  assert.ok(Math.abs(car.heading) < .01, `nose stayed on the road: ${car.heading}`);
});

test('steering into the bend first straightens the nose, then moves the car across', () => {
  const race = racing(CIRCUIT_ID), car = race.player, out = Math.sign(cornerRate({ ...race, elapsed: 0 }, { ...car, distance: 500, speed: 88 }));
  Object.assign(car, { distance: 500, speed: 88, x: 0, steering: 0 });
  for (let i = 0; i < 40; i++) stepRace(race, HANDS_OFF, 1 / 60);
  const built = car.heading;
  assert.ok(built * out > .05, `heading built: ${built}`);
  // Once the steering ramp (STEER_RAMP s) reaches full lock, the nose turns back before the car moves across.
  for (let i = 0; i < Math.ceil(STEER_RAMP * 60); i++) stepRace(race, { throttle: true, steer: -out }, 1 / 60);
  assert.ok(Math.abs(car.heading) < Math.abs(built), `counter-steer turns the nose back: ${built} -> ${car.heading}`);
  for (let i = 0; i < 60 && car.heading * out > 1e-6; i++) stepRace(race, { throttle: true, steer: -out }, 1 / 60);
  assert.ok(Math.abs(car.heading) < 1e-6, `the nose straightened: ${car.heading}`);
  const x = car.x;
  stepRace(race, { throttle: true, steer: -out }, 1 / 60);
  assert.ok((car.x - x) * out < 0, `then the lock left over moves the car inward: ${x} -> ${car.x}`);
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

test('AUTO on or off, a released car in a bend runs into the outside rail, at the same moment at 30, 60 and 120 FPS', () => {
  for (const input of [AUTO, HANDS_OFF]) {
    const { car, path } = intoSharpest(input);
    assert.ok(path.length < 90, `reached the rail in ${(path.length / 60).toFixed(2)} s`);
    assert.ok(car.railContactSide || car.scrape, 'hit the rail');
  }
  const contactAt = hz => {
    const race = racing(CIRCUIT_ID, 'circuit', hz), car = race.player;
    Object.assign(car, { distance: 500, speed: 88, x: 0, steering: 0 });
    let i = 0;
    for (; i < 6 * hz && !car.railContactSide && !car.scrape; i++) { car.speed = 88; stepRace(race, AUTO, 1 / hz); }
    return i / hz;
  };
  const reference = contactAt(60);
  assert.ok(reference < 6, 'AUTO hit the rail in the circuit bend');
  for (const hz of [30, 120]) assert.ok(Math.abs(contactAt(hz) - reference) <= 1 / 30, `${hz} FPS: ${contactAt(hz)} s vs ${reference} s`);
});

/** Metres into Neon's 1 km straight from 5996 m: no bend pushes at any speed and no section (crosswind, tunnel) acts. */
const NEON_STRAIGHT = 6300;

// Owner, 2026-11-28: after a bend, released on a straight, the nose straightens by itself and the slide stops.
test('back on a straight a released car straightens its nose and stops sliding, AUTO on or off, at 30, 60 and 120 FPS', () => {
  for (let d = NEON_STRAIGHT; d < NEON_STRAIGHT + 400; d += 4) assert.ok(cornerPush('neon', d, 88) === 0, `a straight at ${d} m`);
  assert.ok(!racing('neon').sections.some(s => s.to > NEON_STRAIGHT - 50 && s.from < NEON_STRAIGHT + 400), 'no section acts there');
  const travel = {};
  for (const hz of [30, 60, 120]) for (const input of [AUTO, HANDS_OFF]) {
    const race = racing('neon', 'time', hz), car = race.player;
    Object.assign(car, { distance: NEON_STRAIGHT, speed: 88, x: 0, steering: 0, heading: .08 });
    for (let i = 0; i < hz; i++) { car.speed = 88; stepRace(race, input, 1 / hz); }
    assert.ok(Math.abs(car.heading) < 1e-3, `${hz} Hz: the nose straightened within 1 s: ${car.heading}`);
    const x = car.x;
    for (let i = 0; i < hz / 2; i++) { car.speed = 88; stepRace(race, input, 1 / hz); }
    assert.ok(Math.abs(car.x - x) < .02, `${hz} Hz: the slide stopped: ${x} -> ${car.x}`);
    assert.ok(car.x > 0 && car.x < 3, `${hz} Hz: the leftover heading carried it ${car.x} m, not across the road`);
    travel[hz] = car.x;
  }
  for (const hz of [30, 120]) assert.ok(Math.abs(travel[hz] - travel[60]) < .05, `${hz} FPS: ${travel[hz]} vs ${travel[60]}`);
});

// Case A (owner, 2026-11-28): Tokyo's opening 1 km pushes up to .15 m/s at 88 m/s. Released, its heading grew
// from that and the car slid 9.9 m into the rail on what reads as a straight.
test('released on a near-straight the car goes dead straight, at 88 m/s and NITRO speed, at 30, 60 and 120 FPS', () => {
  assert.ok(Math.abs(cornerPush('tokyo', 500, 88)) > 0, 'the opening straight is not exactly flat');
  for (const hz of [30, 60, 120]) for (const speed of [88, 118]) for (const input of [AUTO, HANDS_OFF]) {
    const race = racing('tokyo', 'time', hz), car = race.player;
    Object.assign(car, { distance: 0, speed, x: 2, steering: 0, heading: 0 });
    while (car.distance < 800) { car.speed = speed; stepRace(race, input, 1 / hz); }
    assert.equal(car.x, 2, `${hz} Hz at ${speed} m/s, AUTO ${!!input.laneAssist}: slid off its lane`);
  }
});

test('every track, released on a straight with the nose on the road, the car does not move sideways', () => {
  let checked = 0; // Alpine, Coastal, Cosmic and the circuit have no straight at all
  for (const id of TRACKS) {
    const race = racing(id), car = race.player;
    for (let steps = 0; race.phase === 'racing' && steps < 60 * 900; steps++) {
      // A straight reads under .2 m/s of push at 88 m/s (a 7 km radius), scaled to the car's own speed.
      const flat = .2 * (Math.max(0, car.speed - 35) / 53) ** 2;
      const x = car.x, before = { heading: car.heading, rate: cornerRate(race, car), quiet: !car.section && !car.recovery && car.cooldown === 0 };
      stepRace(race, HANDS_OFF, 1 / 60);
      if (before.heading !== 0 || Math.abs(before.rate) >= flat || !before.quiet || car.section || car.recovery || car.cooldown > 0 || Math.abs(car.x) >= ROAD_LIMIT) continue;
      checked++;
      assert.equal(car.x, x, `${id} at ${car.distance.toFixed(0)} m: slid ${car.x - x} m on a straight`);
    }
  }
  assert.ok(checked > 60 * 60, `only ${checked} straight steps`);
});

test('every track, no steering, AUTO off: runs into the rail and still finishes', () => {
  for (const id of TRACKS) {
    const run = drive(id, HANDS_OFF);
    assert.ok(run.finished, `${id}: did not finish`);
    assert.ok(run.dev >= 2.5, `${id}: stayed in lane, deviation ${run.dev.toFixed(2)} m`);
  }
});

test('a released car at a fork keeps the ground route although the corner carried it past the deadband', () => {
  for (const id of TRACKS) for (const input of [AUTO, HANDS_OFF]) {
    assert.equal(drive(id, input).offRoute, 0, `${id}: left the ground route hands-free`);
  }
});

/** 5 s held on the sharpest spot of a Dune edge, rail clamped as resolveRail does; returns the lane the fork reads. */
function pinnedForkLane(startX, placeEachStep, steer = () => 0) {
  const race = createRace('dune-tempest'), travel = race.course.cars.get('YOU').travel;
  const car = { x: 0, speed: 88, altitude: 0, steering: 0, distance: 0, cornerDrift: 0, cornerX: 0 };
  const push = s => { travel.localS = s; return roadDrift(race, { ...car }, undefined, false, 1); };
  travel.currentEdgeId = 'dune-s-bends';
  let sharpest = 0;
  for (let s = 0; s < 500; s += 4) if (Math.abs(push(s)) > Math.abs(push(sharpest))) sharpest = s;
  const side = Math.sign(push(sharpest));
  travel.localS = sharpest;
  Object.assign(car, { x: startX * side, cornerX: startX * side });
  for (let i = 0; i < 300; i++) {
    if (placeEachStep) car.x = startX * side;
    car.steering = steer(car.x * side) * side; // steer in the corner's frame: positive is outward
    const x = car.x + car.steering * 9 / 60 + roadDrift(race, car, undefined, false, 1 / 60);
    if (Math.abs(x) > ROAD_LIMIT) car.heading = 0; // as meetRail: the rail lines the nose up with the road
    car.x = Math.abs(x) > ROAD_LIMIT ? side * 9.9 : x;
  }
  return { lane: forkLateral(car.x, car.cornerDrift) * side, pinned: Math.abs(car.x) };
}

test('a lane the driver chose or placed still picks its fork after the corner pins the car to the rail', () => {
  const chosen = pinnedForkLane(5, false);
  assert.ok(chosen.pinned > 9, `reached the rail: ${chosen.pinned}`);
  assert.ok(Math.abs(chosen.lane - 5) < .1, `steered to 5 m, fork reads ${chosen.lane}`);
  assert.ok(Math.abs(pinnedForkLane(5, true).lane - 5) < .1, 'a lane placed every step, as the course bots do');
  assert.ok(Math.abs(pinnedForkLane(0, false).lane) < .5, 'a car never steered stays in the deadband');
});

test('a driver steering against the corner keeps its lane at the fork; steering outward is intent', () => {
  // A proportional driver holding 2 m settles wide of it: the push outruns its small corrections.
  const holding = pinnedForkLane(2, false, x => Math.max(-1, Math.min(1, (2 - x) * .5)));
  assert.ok(holding.pinned > 2.5, `settled wide of the deadband: ${holding.pinned}`);
  // .11: one 60 Hz frame of the 6 m/s cap, the steering this frame moved before the fork discounts it.
  assert.ok(Math.abs(holding.lane - 2) < .11, `held 2 m, fork reads ${holding.lane}`);
  assert.ok(pinnedForkLane(2, false, () => 1).lane > 9, 'steering outward at the rail picks the outer branch');
});

test('a steering driver holds its lane through every corner at 88 m/s and at NITRO speed', () => {
  for (const id of TRACKS) for (const lane of [-2.5, -2, 2, 2.5]) for (const nitro of [false, true]) {
    const run = drive(id, keeper(lane, nitro), { lane });
    assert.ok(run.finished, `${id}: did not finish`);
    assert.ok(run.dev < 1.25, `${id} lane ${lane} nitro ${nitro}: deviation ${run.dev.toFixed(2)} m`);
    assert.equal(run.hard, 0, `${id}: hard rail hits`);
    // ±2.5 m sits on the fork deadband's edge, where the driver's own millimetre overshoot already picks a branch.
    if (Math.abs(lane) < 2.5) assert.equal(run.offRoute, 0, `${id} lane ${lane}: the corner, not the driver, took the branch`);
  }
});

test('AUTO no longer centres a released car on a straight', () => {
  const race = racing('coast');
  Object.assign(race.player, { distance: 20, speed: 40, x: 3.6 });
  for (let i = 0; i < 60; i++) stepRace(race, AUTO, 1 / 60);
  assert.equal(race.player.x, 3.6);
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

test('AUTO leaves player steering untouched at the rail', () => {
  const steer = { throttle: true, steer: -1 };
  const withAuto = circuitStep(car => { car.x = -8.5; car.steering = -1; }, { ...steer, laneAssist: true });
  const withoutForce = 9 * -1 / 60;
  assert.ok(withAuto <= withoutForce, `steering outward keeps its full rate: ${withAuto}`);
});

// Owner, 2026-11-25: taking off must not skip the corner. In the air it acts at half its ground strength.
test('the corner acts at half strength in the air and stays off through tutorial practice', () => {
  assert.ok(circuitStep() < 0, 'grounded car is pushed');
  const race = racing(CIRCUIT_ID), car = { ...race.player, distance: 500, speed: 88, altitude: 0, cooldown: 0 };
  const ground = cornerRate(race, car);
  assert.ok(ground < 0);
  assert.equal(cornerRate(race, { ...car, altitude: 3 }), ground / 2);
  assert.ok(circuitStep(car => { car.altitude = 3; }) < 0, 'a flying car is carried too');
  assert.equal(circuitStep((car, race) => { race.endless = { chunk: 0, milestones: 0, practice: true }; }), 0);
});

// The straight rule judges the road, not the halved air push: a gentle bend a grounded car feels still carries a flying one.
test('released in the air over a gentle bend the car is still carried at half strength', () => {
  const flat = 2e-4 * .5 * (88 - 35) ** 2; // pushFor(STRAIGHT_TURN = 2e-4 rad/m, 88 m/s)
  let checked = 0;
  for (const id of Object.keys(RACE_TRACKS)) {
    const race = racing(id);
    for (let d = 200; d < RACE_TRACKS[id].length - 200 && checked < 40; d += 4) {
      const push = Math.abs(cornerPush(id, d, 88));
      if (push <= flat * 1.05 || push > flat * 1.95) continue; // straight at half strength, a bend on the ground
      const car = { ...race.player, distance: d, x: 0, speed: 88, altitude: 3, steering: 0, heading: 0, cooldown: 0, section: null };
      roadDrift(race, car, undefined, false, 1 / 60);
      assert.notEqual(car.heading, 0, `${id} ${d} m: a ${push.toFixed(3)} m/s bend skipped in the air`);
      checked++;
    }
  }
  assert.ok(checked >= 10, `only ${checked} gentle bends found`);
});

test('the corner heading clears when the car is reset', () => {
  const race = racing(CIRCUIT_ID), car = race.player;
  Object.assign(car, { distance: 500, speed: 88, x: 0 });
  for (let i = 0; i < 30; i++) stepRace(race, HANDS_OFF, 1 / 60);
  assert.ok(Math.abs(car.heading) > .01, `built ${car.heading}`);
  assert.ok(requestRaceReset(race));
  assert.equal(car.heading, 0, 'a reset car faces down the road');
});

test('a car recovering from a hit is not pressed back into what it hit', () => {
  assert.equal(circuitStep((car, race) => { car.cooldown = 1.5; car.impact = { kind: 'barrier', time: race.elapsed }; }), 0,
    'no corner push during a knock');
  assert.ok(circuitStep(car => { car.cooldown = 1; }) < 0, 'a cooldown with no fresh impact (shield block) keeps the push');
});

test('the corner force leaves shortcut corridors and spans on their authored line', () => {
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

test('the push is the same per second at 30, 60 and 120 FPS', () => {
  const travel = hz => {
    const race = racing(CIRCUIT_ID, 'circuit', hz);
    Object.assign(race.player, { distance: 500, speed: 88, x: 0 });
    for (let i = 0; i < hz; i++) stepRace(race, HANDS_OFF, 1 / hz);
    return race.player.x;
  };
  const reference = travel(60);
  assert.ok(reference < -1, `pushed ${reference}`);
  for (const hz of [30, 120]) assert.ok(Math.abs(travel(hz) - reference) < .05, `${hz} FPS: ${travel(hz)} vs ${reference}`);
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

// CI (Node 22, x64) and a Mac (arm64) can disagree in the last bit of Math.sin/cos/atan2; the legacy replay hashes must not.
test('the corner push ignores last-bit trig differences between engines', async () => {
  const samples = async tag => {
    const { cornerPush } = await import(`../src/corner-force.ts?${tag}`); // fresh curvature cache per engine
    return Object.keys(RACE_TRACKS).flatMap(id =>
      Array.from({ length: Math.ceil(RACE_TRACKS[id].length / 4) }, (_, i) => cornerPush(id, i * 4 + 2, 88)));
  };
  const reference = await samples('reference');
  const real = { sin: Math.sin, cos: Math.cos, atan: Math.atan, atan2: Math.atan2 };
  const nudge = value => value + Math.abs(value) * Number.EPSILON; // about one unit in the last place
  Object.assign(Math, { sin: x => nudge(real.sin(x)), cos: x => nudge(real.cos(x)), atan: x => nudge(real.atan(x)),
    atan2: (y, x) => nudge(real.atan2(y, x)) });
  let other;
  try { other = await samples('other-engine'); } finally { Object.assign(Math, real); }
  const differ = reference.filter((push, i) => push !== other[i]).length;
  assert.equal(differ, 0, `${differ} of ${reference.length} samples changed`);
});
