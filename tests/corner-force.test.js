import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, startRace, stepRace, RACE_TRACKS, ROAD_LIMIT } from '../src/game.js';
import { COURSE_TRACKS, isModeTrack } from '../src/race-tracks.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { roadDrift } from '../src/corner-force.ts';
import { forkLateral } from '../src/course-race.ts';

// Cornering needs steering on every track: curves push the car outward and AUTO only guards the rail.
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
  const run = { dev: 0, hard: 0, scrapes: 0, offRoute: 0, maxX: 0 };
  for (let steps = 0; race.phase === 'racing' && steps < hz * 900; steps++) {
    const rail = car.railContactSide, scrape = car.scrape;
    stepRace(race, typeof input === 'function' ? input(car) : input, dt);
    if (!rail && car.railContactSide) run.hard++;
    if (car.scrape !== scrape) run.scrapes++;
    if (!car.recovery && car.cooldown === 0) run.dev = Math.max(run.dev, Math.abs(car.x - lane));
    run.maxX = Math.max(run.maxX, Math.abs(car.x));
    if (ground && !ground.has(race.course.cars.get('YOU').travel.currentEdgeId)) run.offRoute++;
  }
  run.finished = race.phase !== 'racing';
  return run;
}

const keeper = (lane, nitro) => car => {
  if (nitro) car.nitroTime = 2;
  const authority = Math.max(1, Math.min(9, car.speed * .22));
  return { throttle: true, steer: Math.max(-1, Math.min(1, (lane - car.x) * 6 / authority)) };
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

test('every track, no steering, AUTO on: finishes, leaves its lane in corners, never touches the rail', () => {
  for (const id of TRACKS) {
    const run = drive(id, AUTO);
    assert.ok(run.finished, `${id}: did not finish`);
    assert.ok(run.dev >= 2.5, `${id}: stayed in lane, deviation ${run.dev.toFixed(2)} m`);
    assert.equal(run.hard, 0, `${id}: hard rail hits`);
    assert.equal(run.scrapes, 0, `${id}: rail scrapes`);
    assert.ok(run.maxX < ROAD_LIMIT, `${id}: reached the rail at ${run.maxX.toFixed(2)}`);
  }
});

test('every track, no steering, AUTO off: runs wide to the rail without a hard hit', () => {
  for (const id of TRACKS) {
    const run = drive(id, HANDS_OFF);
    assert.ok(run.finished, `${id}: did not finish`);
    assert.ok(run.dev >= 2.5, `${id}: stayed in lane, deviation ${run.dev.toFixed(2)} m`);
    assert.equal(run.hard, 0, `${id}: hard rail hits`);
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
  const push = s => { travel.localS = s; return roadDrift(race, { ...car }, undefined, false, false, 1); };
  travel.currentEdgeId = 'dune-s-bends';
  let sharpest = 0;
  for (let s = 0; s < 500; s += 4) if (Math.abs(push(s)) > Math.abs(push(sharpest))) sharpest = s;
  const side = Math.sign(push(sharpest));
  travel.localS = sharpest;
  Object.assign(car, { x: startX * side, cornerX: startX * side });
  for (let i = 0; i < 300; i++) {
    if (placeEachStep) car.x = startX * side;
    car.steering = steer(car.x * side) * side; // steer in the corner's frame: positive is outward
    const x = car.x + car.steering * 9 / 60 + roadDrift(race, car, undefined, false, false, 1 / 60);
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
  assert.ok(Math.abs(holding.lane - 2) < .1, `held 2 m, fork reads ${holding.lane}`);
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

test('the edge guard only removes outward force', () => {
  const free = circuitStep(car => { car.x = -8.5; });
  const guarded = circuitStep(car => { car.x = -8.5; }, AUTO);
  assert.ok(free < 0, 'the circuit pushes left');
  assert.ok(guarded < 0 && guarded > free, `guard scales the push: ${guarded} vs ${free}`);
  assert.ok(circuitStep(car => { car.x = -9.8; }, AUTO) === 0, 'no force beyond the guard limit, and never a pull back');
  assert.equal(circuitStep(car => { car.x = 8.5; }, AUTO), circuitStep(car => { car.x = 8.5; }), 'inward force is untouched');
});

test('AUTO leaves player steering untouched at the rail', () => {
  const steer = { throttle: true, steer: -1 };
  const withAuto = circuitStep(car => { car.x = -8.5; car.steering = -1; }, { ...steer, laneAssist: true });
  const withoutForce = 9 * -1 / 60;
  assert.ok(withAuto <= withoutForce, `steering outward keeps its full rate: ${withAuto}`);
});

test('the corner force stays off in the air and through tutorial practice', () => {
  assert.ok(circuitStep() < 0, 'grounded car is pushed');
  assert.equal(circuitStep(car => { car.altitude = 3; }), 0);
  assert.equal(circuitStep((car, race) => { race.endless = { chunk: 0, milestones: 0, practice: true }; }), 0);
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
