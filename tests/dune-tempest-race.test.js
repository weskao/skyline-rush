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
import { createRace, startRace, stepRace, racePosition, sprintGaps } from '../src/game.js';
import { chooseBranchByLateral, placeCourseCar } from '../src/course-race.ts';

const groundLength = graph.groundRoute.reduce((sum, id) => sum + routeLength(graph, id), 0);
const AIR = 'canyon-air-crossing';

test('Dune track: measured ground-route length, no 1D lists, topology v1', () => {
  assert.equal(DUNE_TEMPEST_ID, 'dune-tempest');
  assert.equal(DUNE_TEMPEST_TRACK.length, Math.floor(groundLength));
  assert.ok(DUNE_TEMPEST_TRACK.length > 13_000 && DUNE_TEMPEST_TRACK.length < 14_500);
  assert.equal(DUNE_TEMPEST_TRACK.trafficDensity, 0);
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
  assert.throws(() => assertTrackMode(DUNE_TEMPEST_ID, 'time'), { name: 'RangeError', message: 'Dune Tempest is a gated classic sprint' });
  assert.throws(() => assertTrackMode(FROSTBITE_ID, 'time'), { name: 'RangeError', message: 'Frostbite Canyon is a gated classic sprint' });
  assert.doesNotThrow(() => assertTrackMode(DUNE_TEMPEST_ID, 'classic'));
  assert.equal(upcomingReadiness(DUNE_TEMPEST_ID), 'preview');
});

// ---- Task 5: the shared race loop on the CourseGraph runtime ----
const PLAYER_DEADBAND = 2.5;
const courseOf = race => { assert.ok(race.course, 'createRace attaches race.course'); return race.course; };
const laneFor = (incoming, edge) => [0, -5, 5].find(x => chooseBranchByLateral(graph, incoming, x, PLAYER_DEADBAND) === edge);
const pathEdges = (first, third) => ['sunset-start', 'dune-s-bends', first, 'rock-gate-descent', 'canyon-approach',
  'canyon-switchbacks', 'stone-ring-corridor', 'sandstorm-climb', third, 'stone-ring-outlet', 'finish-sprint'];
const PATHS = [['winding-wadi', 'natural-arch-pass'], ['winding-wadi', 'dry-wash-cut'],
  ['dune-crest-cut', 'natural-arch-pass'], ['dune-crest-cut', 'dry-wash-cut']];

// Throttle + BOOST bot holding x on the side of its chosen branch before split1/split3 and centred elsewhere,
// so split2 takes the ground route (the flight edge needs Task 6's gap physics).
function botRace(hz, [first, third]) {
  const race = createRace(DUNE_TEMPEST_ID), dt = 1 / hz;
  startRace(race);
  while (race.phase === 'countdown') stepRace(race, {}, dt);
  const you = courseOf(race).cars.get('YOU'), edges = [you.travel.currentEdgeId], checkpoints = [0];
  const lane = { 'dune-s-bends': laneFor('dune-s-bends', first), 'sandstorm-climb': laneFor('sandstorm-climb', third) };
  for (let i = 0; race.phase === 'racing' && i < hz * 400; i++) {
    race.player.x = lane[you.travel.currentEdgeId] ?? 0;
    stepRace(race, { throttle: true, boost: true }, dt);
    if (edges.at(-1) !== you.travel.currentEdgeId) edges.push(you.travel.currentEdgeId);
    if (checkpoints.at(-1) !== you.travel.nextCheckpoint) checkpoints.push(you.travel.nextCheckpoint);
  }
  return { race, edges, checkpoints };
}

test('createRace(dune-tempest) attaches the course runtime and no 1D-keyed lists', () => {
  const race = createRace(DUNE_TEMPEST_ID);
  assert.ok(race.course, 'race.course defined');
  assert.equal(race.course.spec, DUNE_TEMPEST_RACE);
  assert.deepEqual([...race.course.cars.keys()], ['YOU', ...race.rivals.map(r => r.id)]);
  for (const list of ['rings', 'pickups', 'traffic', 'hazards', 'sections']) assert.deepEqual(race[list], [], list);
  assert.equal(race.length, DUNE_TEMPEST_TRACK.length);
});

// Measured at 60 Hz on the shared engine (no physics change), throttle + BOOST held: 139.16 s winding-wadi/natural-arch-pass
// (the ground route, 13,930 m), 136.30 s winding-wadi/dry-wash-cut, 136.35 s dune-crest-cut/natural-arch-pass, 133.48 s
// dune-crest-cut/dry-wash-cut; rivals finish in 159-200 s. The planned 150 s floor was an unmeasured hypothesis (Frostbite
// precedent): the floor sits below the shortest measured path and above a skipped branch (canyon-switchbacks alone is
// 3,672 m ≈ 37 s), the ceiling catches a stall.
const BOT_MIN = 120, BOT_MAX = 330;
test('a throttle+BOOST bot finishes START → FINISH on all four ground-only paths at 60 Hz', () => {
  for (const [first, third] of PATHS) {
    const { race, edges, checkpoints } = botRace(60, [first, third]), label = `${first}/${third}`;
    assert.equal(race.phase, 'finished', label);
    assert.deepEqual(edges, pathEdges(first, third), label);
    assert.deepEqual(checkpoints, [0, 1, 2, 3, 4], `${label}: cp1..cp4 in order`);
    assert.equal(race.course.rejections, 0, label);
    const { position, time } = race.result;
    assert.ok(Number.isInteger(position) && position >= 1 && position <= 8, `${label} position ${position}`);
    assert.equal(position, 1 + race.rivals.filter(r => r.finishTime !== null && r.finishTime < time).length, label);
    assert.ok(time >= BOT_MIN && time <= BOT_MAX, `${label} finish ${time}s`);
  }
});

// Measured on the ground route: 139.276 / 139.159 / 139.102 s at 30 / 60 / 120 Hz (spread 0.17 s; ≤ 0.17 s on all
// four paths). The finish is interpolated at the gate; the spread is the engine's own per-Hz integration.
const HZ_TOLERANCE = 0.5; // s
test('the bot finish time agrees at 30, 60 and 120 Hz', () => {
  const times = [30, 60, 120].map(hz => {
    const { race } = botRace(hz, PATHS[0]);
    assert.equal(race.phase, 'finished', `${hz} Hz`);
    assert.equal(race.course.rejections, 0, `${hz} Hz`);
    return race.result.time;
  });
  for (const time of times) assert.ok(Math.abs(time - times[1]) <= HZ_TOLERANCE, `30/60/120 Hz: ${times.join(' / ')} s`);
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
