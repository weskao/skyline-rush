import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLE_COURSE_GRAPH as graph, DUNE_TEMPEST_RUNTIME_METADATA as meta } from '../src/courses/dune-tempest-runtime-adapter.ts';
import { DUNE_TEMPEST_COURSE } from '../src/courses/dune-tempest.ts';
import { DUNE_TEMPEST_ID, DUNE_TEMPEST_RACE, DUNE_TEMPEST_TRACK } from '../src/courses/dune-tempest-race.ts';
import { COURSE_RUNTIMES, isCourseRuntime } from '../src/course-runtimes.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { RACE_TRACKS, COURSE_TRACKS, raceTrack, assertTrackMode } from '../src/race-tracks.ts';
import { FROSTBITE_ID, FROSTBITE_TRACK } from '../src/courses/frostbite-race.ts';
import { upcomingReadiness } from '../src/upcoming-tracks.ts';
import { createRace, stepRace, racePosition, sprintGaps, gapChargeWarning } from '../src/game.js';
import { createCourseRuntime, placeCourseCar } from '../src/course-race.ts';
import * as courseStep from '../src/course-race-step.ts';
import { chooseCourseNextEdge } from '../src/course-ai-standings.ts';
import { readFileSync } from 'node:fs';
import { recordTrackId, recordTrackIds, parseRecordTrackId } from '../src/record-layout.ts';
import { recordGhost, validGhost, GHOST_RATE } from '../src/ghost.ts';

import { AIR, SWITCHBACKS, PATHS, botRace, courseOf, laneFor } from './helpers/dune-tempest-race-helpers.js';

const groundLength = graph.groundRoute.reduce((sum, id) => sum + routeLength(graph, id), 0);

test('Dune track: measured ground-route length, classic traffic, topology v1', () => {
  assert.equal(DUNE_TEMPEST_ID, 'dune-tempest');
  assert.equal(DUNE_TEMPEST_TRACK.length, Math.floor(groundLength));
  assert.ok(DUNE_TEMPEST_TRACK.length > 13_000 && DUNE_TEMPEST_TRACK.length < 14_500);
  assert.equal(DUNE_TEMPEST_TRACK.trafficDensity, 0.9); // classic range (user, 2026-11-09)
  assert.deepEqual(DUNE_TEMPEST_TRACK.sections, []);
  assert.equal(DUNE_TEMPEST_TRACK.topology, 'course-graph-runtime');
  assert.equal(DUNE_TEMPEST_TRACK.topologyVersion, graph.version);
  const seeds = Object.values(RACE_TRACKS).map(t => t.seed);
  assert.ok(!seeds.includes(DUNE_TEMPEST_TRACK.seed) && DUNE_TEMPEST_TRACK.seed !== FROSTBITE_TRACK.seed);
});

test('Dune race spec: authored gate band, flight noRoad = complement of solid road, recovery edge', () => {
  assert.equal(DUNE_TEMPEST_RACE.graph, graph);
  assert.deepEqual(DUNE_TEMPEST_RACE.gateHeight, { minHeight: -6, maxHeight: 22 });
  const flight = meta.flightShortcuts.find(f => f.edgeId === AIR);
  const solid = flight.solidRoadIntervals, len = routeLength(graph, AIR);
  const expected = [];
  let at = 0;
  for (const [from, to] of solid) { if (from > at) expected.push([at, from]); at = Math.max(at, to); }
  if (at < len) expected.push([at, len]);
  const gaps = DUNE_TEMPEST_RACE.noRoad[AIR];
  assert.equal(gaps.length, expected.length);
  expected.forEach(([a, b], i) => { assert.ok(Math.abs(gaps[i][0] - a) < 1e-9); assert.ok(Math.abs(gaps[i][1] - b) < 1e-9); });
  assert.ok(Math.abs(gaps[0][0] - 60) < 1e-9 && Math.abs(gaps[0][1] - 983.306) < 1e-3);
  assert.deepEqual(Object.keys(DUNE_TEMPEST_RACE.noRoad), [AIR]);
  assert.deepEqual(DUNE_TEMPEST_RACE.recoveryEdge, { [AIR]: 'canyon-switchbacks' });
});

test('Dune hazards sit at physical arc length (fraction x routeLength)', () => {
  const hazards = DUNE_TEMPEST_COURSE.hazards;
  assert.equal(DUNE_TEMPEST_RACE.hazards.length, hazards.length);
  assert.equal(hazards.length, 9);
  for (const h of hazards) {
    const spec = DUNE_TEMPEST_RACE.hazards.find(x => x.id === h.id);
    assert.equal(spec.edgeId, h.edgeId);
    assert.ok(Math.abs(spec.localS - h.atFraction * routeLength(graph, h.edgeId)) < 1e-9, h.id);
    assert.equal(spec.lateral, h.lateralMeters);
    assert.equal(spec.radius, h.collisionRadiusMeters);
    assert.equal(spec.safePassSide, h.safePassSide);
    assert.equal(spec.aiPreview, h.aiPreviewMeters);
  }
});

test('registry: Dune is a gated course runtime, Frostbite unchanged, never in RACE_TRACKS', () => {
  assert.equal(COURSE_RUNTIMES[DUNE_TEMPEST_ID].spec, DUNE_TEMPEST_RACE);
  assert.equal(COURSE_RUNTIMES[DUNE_TEMPEST_ID].track, DUNE_TEMPEST_TRACK);
  assert.equal(isCourseRuntime(DUNE_TEMPEST_ID), true);
  assert.equal(isCourseRuntime(FROSTBITE_ID), false);
  assert.equal(isCourseRuntime('coast'), false);
  assert.equal(isCourseRuntime('toString'), false);
  assert.equal(raceTrack(DUNE_TEMPEST_ID), DUNE_TEMPEST_TRACK);
  assert.equal(raceTrack(FROSTBITE_ID), FROSTBITE_TRACK);
  assert.equal(COURSE_TRACKS[DUNE_TEMPEST_ID], DUNE_TEMPEST_TRACK);
  assert.equal(COURSE_TRACKS[FROSTBITE_ID], FROSTBITE_TRACK);
  assert.equal(raceTrack('coast'), RACE_TRACKS.coast);
  assert.equal(Object.hasOwn(RACE_TRACKS, DUNE_TEMPEST_ID), false);
  assert.doesNotThrow(() => assertTrackMode(DUNE_TEMPEST_ID, 'time'));
  assert.throws(() => assertTrackMode(DUNE_TEMPEST_ID, 'circuit'), RangeError);
  assert.doesNotThrow(() => assertTrackMode(FROSTBITE_ID, 'time'));
  assert.doesNotThrow(() => assertTrackMode(DUNE_TEMPEST_ID, 'classic'));
  assert.equal(upcomingReadiness(DUNE_TEMPEST_ID), 'playable');
});

// ---- Task 5: the shared race loop on the CourseGraph runtime ----

// User, 2026-11-09: rings, pickups and traffic now ride the graph (course-item-density.test.js); hazards and sections
// still come from the spec only.
test('createRace(dune-tempest) attaches the course runtime with graph-keyed items and traffic', () => {
  const race = createRace(DUNE_TEMPEST_ID);
  assert.ok(race.course, 'race.course defined');
  assert.equal(race.course.spec, DUNE_TEMPEST_RACE);
  assert.deepEqual([...race.course.cars.keys()], ['YOU', ...race.rivals.map(r => r.id), ...race.traffic.map(t => t.id)]);
  assert.equal(race.traffic.length, Math.round(36 * DUNE_TEMPEST_TRACK.trafficDensity));
  for (const list of ['rings', 'pickups']) assert.ok(race[list].length > 0 && race[list].every(item => item.edgeId), list);
  for (const list of ['hazards', 'sections']) assert.deepEqual(race[list], [], list);
  assert.equal(race.length, DUNE_TEMPEST_TRACK.length);
});


test('every rival finishes on a ground branch (never the flight edge) with graph standings', () => {
  const race = createRace(DUNE_TEMPEST_ID), seen = new Map(race.rivals.map(r => [r.id, new Set()])), course = courseOf(race);
  race.phase = 'racing';
  for (let i = 0; i < 60 * 400 && race.rivals.some(r => r.finishTime === null); i++) {
    stepRace(race, {}, 1 / 60); // the player idles on the grid
    for (const r of race.rivals) seen.get(r.id).add(course.cars.get(r.id).travel.currentEdgeId);
  }
  assert.ok(race.rivals.every(r => r.finishTime !== null), race.rivals.map(r => `${r.id}:${r.finishTime}`).join(' '));
  assert.equal(race.course.rejections, 0);
  assert.equal(race.phase, 'racing');
  const visited = [...seen.values()];
  assert.ok(visited.every(edges => !edges.has(AIR)), 'rivals stay ground-only (Q8)');
  for (const cut of ['dune-crest-cut', 'winding-wadi', 'dry-wash-cut', 'natural-arch-pass'])
    assert.ok(visited.some(edges => edges.has(cut)), `some rival takes ${cut}`);
  assert.equal(racePosition(race), 8);
  assert.deepEqual(sprintGaps(race), { ahead: null, behind: null });
});

// Review Focus 3: two cars on parallel branches at equal odometer must not bump, draft or contact.
test('cars on parallel branches never contact, draft or bump; the same edge still does', () => {
  const sBends = routeLength(graph, 'sunset-start') + routeLength(graph, 'dune-s-bends');
  const at = (race, car, id, edge, s) => {
    Object.assign(car, { distance: sBends + s, x: 0, speed: 60 });
    if (car !== race.player) car.homeX = 0;
    placeCourseCar(courseOf(race), id, edge, s, { distance: sBends + s, x: 0, altitude: 0 });
  };
  const run = (rivalEdge, lead) => {
    const race = createRace(DUNE_TEMPEST_ID), [nova] = race.rivals;
    race.phase = 'racing';
    at(race, race.player, 'YOU', 'winding-wadi', 300);
    at(race, nova, nova.id, rivalEdge, 300 + lead);
    for (let i = 0; i < 30; i++) { race.player.x = nova.x; stepRace(race, { throttle: true }, 1 / 60); }
    return { collisions: race.player.collisions, draft: race.player.slipstream.time, novaKnocked: nova.cooldown > 0 };
  };
  assert.deepEqual(run('dune-crest-cut', 0), { collisions: 0, draft: 0, novaKnocked: false });
  assert.deepEqual(run('dune-crest-cut', 8), { collisions: 0, draft: 0, novaKnocked: false });
  assert.ok(run('winding-wadi', 0).collisions > 0, 'control: same edge, equal odometer collides');
  assert.ok(run('winding-wadi', 8).draft > 0, 'control: same edge, 8 m ahead drafts');
  // Rival vs rival (bumpCars) with the player left on the grid.
  const race = createRace(DUNE_TEMPEST_ID), [nova, orbit] = race.rivals;
  race.phase = 'racing';
  at(race, nova, nova.id, 'dune-crest-cut', 300);
  at(race, orbit, orbit.id, 'winding-wadi', 300);
  stepRace(race, {}, 1 / 60);
  assert.equal(nova.cooldown, 0);
  assert.equal(orbit.cooldown, 0);
});

// ---- Task 6: flight gap, hazards and recovery (Q1: the flight edge ships in Phase 1) ----
const raceAt = () => { const race = createRace(DUNE_TEMPEST_ID); race.phase = 'racing'; return race; };
const seat = (race, car, id, edge, s, odometer, extra = {}) => {
  Object.assign(car, { distance: odometer, x: 0, speed: 60, ...extra });
  if (car !== race.player) car.homeX = car.x;
  placeCourseCar(courseOf(race), id, edge, s, { distance: odometer, x: car.x, altitude: car.altitude || 0 });
};

test('no FLY on the flight edge: falls in the gap, recovered on canyon-switchbacks, never ahead of split2', () => {
  let split2 = null, before = null, at = null;
  const { race } = botRace(60, PATHS[0], { second: AIR, pilot: false, trace: (r, you) => {
    if (you.travel.currentEdgeId === AIR && split2 === null) split2 = you.edgeStart;
    if (r.player.falls === 1 && at === null) at = { ...you.travel, distance: r.player.distance, speed: r.player.speed,
      fall: r.player.fall, elapsed: r.elapsed, score: r.player.score };
    if (r.player.falls === 0) before = { speed: r.player.speed, nextCheckpoint: you.travel.nextCheckpoint, score: r.player.score };
  } });
  assert.ok(split2 !== null, 'took the flight edge');
  assert.ok(at, 'fell once');
  assert.equal(at.currentEdgeId, SWITCHBACKS);
  assert.ok(at.localS >= 5 && at.localS <= 65, `recovery slot ${at.localS}`);
  assert.equal(at.nextCheckpoint, before.nextCheckpoint, 'checkpoints unchanged');
  assert.ok(at.distance <= split2 + 1e-9, `odometer ${at.distance} not ahead of split2 ${split2}`);
  assert.equal(at.fall.time, at.elapsed);
  assert.ok(Math.abs(at.speed - 0.4 * before.speed) <= 0.4 * 60 / 60, `speed ${at.speed} vs 0.4 x ${before.speed}`);
  assert.ok(at.score <= before.score, 'no score in the recovery frame');
  assert.equal(race.course.rejections, 0);
  assert.equal(race.phase, 'finished', 'finishes via canyon-switchbacks after the fall');
});


// Review Focus 4: the frame of a recovery collects no gate, hazard or score, even with a hazard between the
// recovery edge's start and the recovery slot (inside a naive prev→new sweep window).
test('the recovery frame collects no gate, hazard or score sweep', () => {
  const race = raceAt(), probe = { id: 'probe', edgeId: SWITCHBACKS, localS: 2.5, lateral: 0, radius: 2, safePassSide: 'left', aiPreview: 120 };
  race.traffic = []; // the hand-built runtime below seats only the eight racers
  const grid = [race.player, ...race.rivals].map((car, i) => ({ id: i ? car.id : 'YOU', distance: car.distance, x: car.x }));
  race.course = createCourseRuntime({ ...DUNE_TEMPEST_RACE, hazards: [...DUNE_TEMPEST_RACE.hazards, probe] }, grid);
  const split2 = 6000, you = race.course.cars.get('YOU');
  seat(race, race.player, 'YOU', AIR, 59.5, split2 + 59.5); // on the takeoff pad; this frame's 1 m step enters the gap
  const { nextCheckpoint } = you.travel, { score, collisions } = race.player;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.player.falls, 1);
  assert.equal(race.player.fall.time, race.elapsed);
  assert.deepEqual([you.travel.currentEdgeId, you.travel.localS], [SWITCHBACKS, 5], 'seated at the first clear slot, not stepped');
  assert.equal(you.travel.nextCheckpoint, nextCheckpoint, 'no gate');
  assert.equal(race.player.collisions, collisions, 'no hazard');
  assert.ok(race.player.score <= score, 'no score');
  assert.ok(race.player.distance <= split2);
  assert.equal(race.course.rejections, 0);
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.player.collisions, collisions, 'the probe behind the slot is never swept');
});

test('a course hazard hits the player on its own edge only; rivals steer to its safe side within aiPreview', () => {
  const rock = DUNE_TEMPEST_RACE.hazards.find(h => h.id === 'rock-b'); // winding-wadi, x = 10, r = 5, pass left
  const sBends = routeLength(graph, 'sunset-start') + routeLength(graph, 'dune-s-bends');
  const drive = edge => {
    const race = raceAt();
    seat(race, race.player, 'YOU', edge, rock.localS - 20, sBends + rock.localS - 20, { x: rock.lateral - 1 });
    for (let i = 0; i < 40; i++) { race.player.x = rock.lateral - 1; stepRace(race, { throttle: true }, 1 / 60); }
    return race.player;
  };
  const hit = drive('winding-wadi');
  assert.equal(hit.collisions, 1);
  assert.equal(hit.impact.kind, 'barrier');
  assert.equal(drive('dune-crest-cut').collisions, 0, 'parallel branch: no contact');

  const fall = DUNE_TEMPEST_RACE.hazards.find(h => h.id === 'fall-a'); // rock-gate-descent, x = -9, r = 4, pass right
  const descent = sBends + routeLength(graph, 'winding-wadi');
  const race = raceAt(), [nova] = race.rivals, novaCar = courseOf(race).cars.get(nova.id);
  seat(race, nova, nova.id, 'rock-gate-descent', fall.localS - fall.aiPreview - 30, descent + fall.localS - fall.aiPreview - 30, { x: fall.lateral });
  let xAtPreview = null;
  while (novaCar.travel.localS < fall.localS) {
    stepRace(race, {}, 1 / 60);
    if (xAtPreview === null && fall.localS - novaCar.travel.localS <= fall.aiPreview) xAtPreview = nova.x;
  }
  assert.equal(xAtPreview, fall.lateral, 'holds its lane until the hazard is within aiPreview');
  assert.ok(nova.x > fall.lateral + fall.radius, `passes on the safe (right, +x) side: x ${nova.x}`);
  assert.equal(nova.cooldown, 0, 'not knocked');

  // No room to steer: a rival seated 3 m before it in its footprint is knocked.
  const late = raceAt(), [orbit] = late.rivals;
  seat(late, orbit, orbit.id, 'rock-gate-descent', fall.localS - 3, descent + fall.localS - 3, { x: fall.lateral });
  for (let i = 0; i < 10; i++) stepRace(late, {}, 1 / 60);
  assert.ok(orbit.cooldown > 0, 'rival knocked by the hazard');
});

test('courseGapWarning: within 300 m before the gap on the lane toward the flight edge, when fuel < need', () => {
  assert.equal(typeof courseStep.courseGapWarning, 'function', 'course-race-step exports courseGapWarning');
  const { courseGapWarning } = courseStep;
  const approach = routeLength(graph, 'canyon-approach'), race = raceAt(), [from] = DUNE_TEMPEST_RACE.noRoad[AIR][0];
  const toward = laneFor('canyon-approach', AIR), split2 = 5000;
  seat(race, race.player, 'YOU', 'canyon-approach', approach - 200, split2 - 200, { x: toward, fuel: 5 });
  const warning = courseGapWarning(race);
  assert.ok(warning, 'warned 260 m before the gap');
  assert.ok(Math.abs(warning.from - (split2 + from)) < 1e-9, `gap odometer ${warning.from}`);
  assert.ok(warning.need > 5);
  assert.deepEqual(gapChargeWarning(race), warning, 'game.js dispatches to the graph warning');
  race.player.fuel = warning.need + 1;
  assert.equal(courseGapWarning(race), null, 'enough charge');
  race.player.fuel = 5; race.player.x = 0;
  assert.equal(courseGapWarning(race), null, 'ground lane: no gap ahead');
  seat(race, race.player, 'YOU', 'canyon-approach', approach - 300, split2 - 300, { x: toward, fuel: 5 });
  assert.equal(courseGapWarning(race), null, '360 m before the gap: out of range');
  seat(race, race.player, 'YOU', AIR, 30, split2 + 30, { fuel: 5 });
  assert.ok(courseGapWarning(race), 'on the takeoff pad');
});

test('rivals never select the flight edge at split2 (Q8 ground-only AI)', () => {
  for (let seed = 0; seed < 200; seed++) for (let driver = 1; driver <= 7; driver++)
    assert.notEqual(chooseCourseNextEdge(graph, 'split2', driver, false, seed), AIR, `seed ${seed} driver ${driver}`);
});

// Carried from the Task 5 review: the step bound comes from speed·dt (pace·dt for rivals), not the odometer delta,
// so an odometer rewrite (e.g. dropCar setting `distance`) is rejected and the car is re-seated, never silently accepted.
test('a non-physical odometer jump is rejected and the car re-seated through placeCourseCar', () => {
  const race = raceAt(), you = courseOf(race).cars.get('YOU'), [nova] = race.rivals;
  for (let i = 0; i < 120; i++) stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.course.rejections, 0);
  race.player.distance += 50;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.course.rejections, 1, 'player jump rejected');
  assert.equal(you.travel.currentEdgeId, 'sunset-start');
  assert.ok(you.travel.localS >= 5 && you.travel.localS <= 65, `re-seated at ${you.travel.localS}`);
  assert.ok(Math.abs(you.edgeStart + you.travel.localS - race.player.distance) < 1e-9, 'odometer and travel agree');
  nova.distance += 50;
  stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.course.rejections, 2, 'rival jump rejected');
  const novaCar = race.course.cars.get(nova.id);
  assert.ok(Math.abs(novaCar.edgeStart + novaCar.travel.localS - nova.distance) < 1e-9);
  for (let i = 0; i < 60; i++) stepRace(race, { throttle: true }, 1 / 60);
  assert.equal(race.course.rejections, 2, 'both keep stepping after recovery');
});

// ---- Task 6 follow-up: the graph gap-charge need comes from pulsed-FLY usage, not continuous thrust ----
test('courseGapWarning at 88 m/s, 300 m before the gap: full tank → null; below the pulsed need → warned, need ≤ 100', () => {
  const approach = routeLength(graph, 'canyon-approach'), [from] = DUNE_TEMPEST_RACE.noRoad[AIR][0], split2 = 5000;
  const race = raceAt(), at = approach - (300 - from);
  seat(race, race.player, 'YOU', 'canyon-approach', at, split2 - (approach - at), { x: laneFor('canyon-approach', AIR), speed: 88, fuel: 100 });
  assert.equal(courseStep.courseGapWarning(race), null, 'a full tank crosses with pulsed FLY');
  race.player.fuel = 0;
  const { need } = courseStep.courseGapWarning(race);
  assert.ok(need <= 100, `pulsed need ${need} is reachable`);
  race.player.fuel = need - 0.01;
  assert.ok(courseStep.courseGapWarning(race), 'just below the need: warned');
  race.player.fuel = need;
  assert.equal(courseStep.courseGapWarning(race), null, 'at the need: no warning');
});

// The warning's promise: with exactly the need it reports at the top of the flight edge (no warning shown), the scripted
// pulse bot crosses; the need covers the measured usage with its stated margin; with half the measured usage it falls.
test('pulsed need: no-warning fuel crosses, margin covers the measured usage, a starved tank falls', () => {
  const run = fuelAt => {
    let need = null, entry = null, low = Infinity;
    const { race } = botRace(60, PATHS[0], { second: AIR, trace: (r, you) => {
      if (you.travel.currentEdgeId !== AIR) return;
      if (need === null) {
        r.player.fuel = 0; need = courseStep.courseGapWarning(r).need;
        r.player.fuel = entry = fuelAt(need);
      }
      low = Math.min(low, r.player.fuel);
    } });
    return { race, need, used: entry - low };
  };
  const full = run(() => 100);
  assert.equal(full.race.player.falls, 0);
  assert.ok(full.need <= 100);
  assert.ok(full.used * 1.5 <= full.need + 1e-9, `measured ${full.used} × 1.5 margin ≤ need ${full.need}`);
  const exact = run(need => need);
  assert.equal(exact.race.player.falls, 0, `crosses with exactly the need ${exact.need}`);
  assert.equal(exact.race.course.rejections, 0);
  const starved = run(() => full.used / 2);
  assert.equal(starved.race.player.falls, 1, 'half the measured usage: falls into the gap');
});

// ---- Task 7: topology-keyed results without Ghost (Q4) ----
const KEY = 'dune-tempest@t1l1';
const memory = () => {
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  return store;
};
const syntheticTrace = time => Array.from({ length: Math.floor(time * GHOST_RATE) + 1 }, (_, i) => [Math.min(DUNE_TEMPEST_TRACK.length, i * DUNE_TEMPEST_TRACK.length / (time * GHOST_RATE)), 0, 0]);
async function settleDune(race, trace) {
  const { settleRace } = await import('../src/race-results.ts');
  const { loadSessionProgress } = await import('../src/session-progress.ts');
  const { createGhostStore } = await import('../src/ghost-store.ts');
  const progress = loadSessionProgress(['coast']), ghosts = createGhostStore();
  const settled = settleRace(race, { series: { sprintSeries: null, cup: null, stunt: null }, progress, ghosts, daily: null, trace });
  return { settled, ghosts };
}

test('Dune records live under one topology-keyed id', () => {
  assert.equal(recordTrackId(DUNE_TEMPEST_ID), KEY);
  assert.deepEqual(recordTrackIds(DUNE_TEMPEST_ID), [KEY]);
  assert.deepEqual(parseRecordTrackId(KEY), { trackId: DUNE_TEMPEST_ID, layout: 1 });
  assert.equal(parseRecordTrackId('dune-tempest@t2l1'), null);
  assert.equal(recordTrackId('coast'), 'coast@6', 'Classic still uses a layout version without a topology prefix');
});

test('a finished Dune race settles history and a topology-keyed best; no Ghost, medals, stars, unlocks or NEXT', async () => {
  const store = memory();
  try {
    const samples = [];
    const { race } = botRace(60, PATHS[0], { trace: r => recordGhost(samples, r) });
    assert.equal(race.phase, 'finished');
    const { settled, ghosts } = await settleDune(race, samples);
    const time = race.result.time;
    assert.equal(settled.record, true);
    assert.equal(settled.next, null, 'not in the campaign: no NEXT');
    assert.deepEqual(settled.medals, []);
    assert.deepEqual([...store.keys()].sort(), ['skyline-rush-best-tracks', 'skyline-rush-history', 'skyline-rush-unlocked']);
    const read = k => JSON.parse(store.get(k));
    assert.deepEqual(Object.keys(read('skyline-rush-best-tracks')), [KEY]);
    assert.equal(read('skyline-rush-best-tracks')[KEY], race.elapsed);
    assert.deepEqual(read('skyline-rush-history').map(r => r.track), [DUNE_TEMPEST_ID]);
    assert.deepEqual(read('skyline-rush-unlocked'), ['coast']);
    assert.equal(ghosts.classic(DUNE_TEMPEST_ID), null, 'a real Dune trace saves no Ghost');
    assert.ok(time > 0);
  } finally { delete globalThis.localStorage; }
});

test('a 600-sample trace never validates or saves a Ghost on a graph-runtime id', async () => {
  const store = memory();
  try {
    const time = 60, trace = syntheticTrace(time);
    assert.equal(trace.length, 601);
    assert.equal(validGhost({ time, samples: trace }, DUNE_TEMPEST_ID), false, 'graph-runtime ids never hold a Ghost');
    const race = Object.assign(createRace(DUNE_TEMPEST_ID), { phase: 'finished', elapsed: time,
      result: { position: 1, time, score: 900, stars: 3, collisions: 0, nearMisses: 0, perfectLines: 9, nitroChain: 3, success: true } });
    const { ghosts } = await settleDune(race, trace);
    assert.equal(store.get('skyline-rush-ghosts'), undefined, 'no Ghost key written');
    assert.equal(ghosts.classic(DUNE_TEMPEST_ID), null);
    assert.equal(store.get('skyline-rush-stars'), undefined);
    assert.equal(store.get('skyline-rush-medals'), undefined);
  } finally { delete globalThis.localStorage; }
});

test('firestore.rules accepts the Dune topology-keyed best', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const listed = [...rules.match(/function bestIds\(\) \{[^}]*\}/)[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(listed.includes(KEY));
  assert.ok(rules.includes(`math.abs(b.get('${KEY}', 302400) - 302400) < 302400`), 'validBests checks the key inline');
});
