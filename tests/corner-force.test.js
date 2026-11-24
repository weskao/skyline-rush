import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, requestRaceReset, RACE_TRACKS, ROAD_LIMIT, STEER_RAMP } from '../src/game.js';
import { COURSE_TRACKS, isModeTrack } from '../src/race-tracks.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { cornerPush, cornerRate, roadDrift } from '../src/corner-force.ts';
import { forkLateral } from '../src/course-race.ts';

// Cornering needs steering on every track: a released car keeps its nose on its line while the road bends away, so it
// runs into the outer rail; AUTO only steers it back off a rail it touched.
const TRACKS = [...Object.keys(RACE_TRACKS), ...Object.keys(COURSE_TRACKS), CIRCUIT_ID];
const modeOf = id => id === CIRCUIT_ID ? 'circuit' : 'time';
const AUTO = { throttle: true, laneAssist: true };
const HANDS_OFF = { throttle: true };
// Corner plus crosswind at the 7 m/s cap leaves AUTO's 7.65 m/s steer .65 m/s: 1 m from the rail in 1.54 s, plus the ramp.
const SLOWEST_CLEAR = 1.8; // s

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
  const run = { dev: 0, hard: 0, scrapes: 0, offRoute: 0, maxX: 0, pinned: 0, slowestClear: 0 };
  for (let steps = 0, pin = 0, sinceTouch = null; race.phase === 'racing' && steps < hz * 900; steps++) {
    const rail = car.railContactSide, scrape = car.scrape;
    stepRace(race, typeof input === 'function' ? input(car) : input, dt);
    if (!rail && car.railContactSide) run.hard++;
    if (car.scrape !== scrape) run.scrapes++;
    if (!car.recovery && car.cooldown === 0) run.dev = Math.max(run.dev, Math.abs(car.x - lane));
    run.maxX = Math.max(run.maxX, Math.abs(car.x));
    pin = Math.abs(car.x) >= ROAD_LIMIT - .35 && car.altitude === 0 ? pin + dt : 0;
    run.pinned += pin && dt;
    // From AUTO's first frame after a rail contact until the car is 1 m clear of the rail.
    if (car.autoRecover && sinceTouch === null) sinceTouch = 0;
    if (sinceTouch !== null) sinceTouch = Math.abs(car.x) < ROAD_LIMIT - 1 ? null : sinceTouch + dt;
    run.slowestClear = Math.max(run.slowestClear, sinceTouch ?? 0);
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

// Every hands-free run now meets the rail; nose-first contacts are hard hits, the run still finishes.
test('every track, no steering, AUTO on: the car runs into the rail, and AUTO steers it off again', () => {
  let touched = 0;
  for (const id of TRACKS) {
    const auto = drive(id, AUTO), free = drive(id, HANDS_OFF);
    assert.ok(auto.finished, `${id}: did not finish`);
    assert.ok(auto.dev >= 2.5, `${id}: stayed in lane, deviation ${auto.dev.toFixed(2)} m`);
    assert.ok(auto.slowestClear < SLOWEST_CLEAR, `${id}: AUTO took ${auto.slowestClear.toFixed(2)} s to steer 1 m clear of the rail`);
    assert.ok(auto.pinned < free.pinned, `${id}: AUTO ${auto.pinned.toFixed(1)} s at the rail vs ${free.pinned.toFixed(1)} s without`);
    if (auto.scrapes + auto.hard) touched++;
  }
  assert.equal(touched, TRACKS.length, 'every track carries a hands-free car into the rail');
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

test('AUTO does not soften the corner: the push is the same with and without it', () => {
  assert.ok(circuitStep() < 0, 'the circuit pushes left');
  for (const x of [-9.8, -8.5, 0, 8.5]) {
    assert.equal(circuitStep(car => { car.x = x; }, AUTO), circuitStep(car => { car.x = x; }), `x ${x}`);
  }
});

/** Hands-free at 88 m/s on the circuit, starting pinned to the rail its right-hander pushes toward. */
function fromRail(input, seconds, hz = 60) {
  const race = racing(CIRCUIT_ID, 'circuit', hz), car = race.player, path = [];
  Object.assign(car, { distance: 500, speed: 88, x: -(ROAD_LIMIT - .3), steering: 0 });
  for (let i = 0; i < seconds * hz; i++) {
    car.speed = 88;
    stepRace(race, input, 1 / hz);
    path.push({ x: car.x, steering: car.steering, scraped: !!car.scrape });
  }
  return path;
}

test('after a rail contact AUTO eases the car back toward the centre, then lets the corner carry it again', () => {
  const path = fromRail(AUTO, 12), first = path.findIndex(p => p.steering > 0);
  assert.ok(first > 0 && first < 30, `AUTO started steering at step ${first}`);
  assert.ok(path[first - 1].scraped, 'only after the car really hit the rail');
  assert.ok(path[first].steering <= (1 / 60) / STEER_RAMP + 1e-9, `steers on the ramp: ${path[first].steering}`);
  const back = path.findIndex(p => p.x > -2);
  assert.ok(back > 0, `never got back near the centre: ${Math.max(...path.map(p => p.x)).toFixed(2)}`);
  for (let i = first + 1; i <= back; i++) {
    assert.ok(Math.abs(path[i].x - path[i - 1].x) <= (9 + 7) / 60 + 1e-9, `no jump at step ${i}`);
  }
  assert.ok(path.slice(back).some(p => p.steering === 0), 'AUTO let go near the centre');
  assert.ok(path.slice(back).some(p => p.x < -9), 'the corner carried the released car out again');
});

test('the player steering wins over AUTO, and AUTO off never steers off the rail', () => {
  assert.ok(fromRail({ ...AUTO, steer: -1 }, 1).every(p => p.steering <= 0), 'steering into the rail is not overridden');
  assert.ok(fromRail(HANDS_OFF, 2).every(p => p.steering === 0 && p.x <= -(ROAD_LIMIT - .35)), 'AUTO off stays on the rail');
});

test('AUTO steers off the rail at the same pace at 30, 60 and 120 FPS', () => {
  const at = hz => fromRail(AUTO, 1, hz).at(-1).x, reference = at(60);
  assert.ok(reference > -9, `moved off the rail: ${reference}`);
  for (const hz of [30, 120]) assert.ok(Math.abs(at(hz) - reference) < .15, `${hz} FPS: ${at(hz)} vs ${reference}`);
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
