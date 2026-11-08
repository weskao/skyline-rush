import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SKYFALL_COURSE, SKYFALL_OBSTACLES, SKYFALL_GROUND_PATH, hasSkyfallRoadContact } from '../src/courses/skyfall-archipelago.ts';
import { PLAYABLE_COURSE_GRAPH as graph } from '../src/courses/skyfall-archipelago-runtime-adapter.ts';
import { COURSE_RUNTIMES, isCourseRuntime } from '../src/course-runtimes.ts';
import { routeLength } from '../src/course-route-frame.ts';
import { RACE_TRACKS, COURSE_TRACKS, raceTrack, assertTrackMode } from '../src/race-tracks.ts';
import { DUNE_TEMPEST_TRACK } from '../src/courses/dune-tempest-race.ts';
import { FROSTBITE_TRACK } from '../src/courses/frostbite-race.ts';
import { upcomingReadiness } from '../src/upcoming-tracks.ts';
import { createRace, startRace, stepRace, CAR_HEIGHT } from '../src/game.js';
import { chooseBranchByLateral, placeCourseCar } from '../src/course-race.ts';
import { recordTrackId, recordTrackIds, parseRecordTrackId } from '../src/record-layout.ts';
import { validGhost, GHOST_RATE } from '../src/ghost.ts';

// Plan Task 13: Skyfall Archipelago on the shared CourseGraph runtime (spec §4, Q5 one sampler, Q6 band, Q8 ground AI).
const ID = 'skyfall-archipelago';
const entry = () => { const e = COURSE_RUNTIMES[ID]; assert.ok(e, 'Skyfall registered in COURSE_RUNTIMES'); return e; };
const spec = () => entry().spec;
const AIRS = ['a-air', 'b-air', 'c-air'];
const GROUNDS = ['a-ground', 'b-ground', 'c-ground'];
const INCOMING = ['approach', 'midway-one', 'midway-two'];
const groundLength = SKYFALL_GROUND_PATH.reduce((sum, id) => sum + routeLength(graph, id), 0);

test('Skyfall track: measured ground-route length, no 1D lists, topology v1, own seed', () => {
  const track = entry().track;
  assert.equal(track.length, Math.floor(groundLength));
  assert.ok(track.length > 16_000 && track.length < 17_000, `ground route ${groundLength}`);
  assert.equal(track.trafficDensity, 0);
  assert.deepEqual(track.sections, []);
  assert.equal(track.topology, 'course-graph-runtime');
  assert.equal(track.topologyVersion, graph.version);
  const seeds = [...Object.values(RACE_TRACKS), DUNE_TEMPEST_TRACK, FROSTBITE_TRACK].map(t => t.seed);
  assert.ok(!seeds.includes(track.seed));
});

test('Skyfall race spec: engine gate band (Q6), gaps in graph metres (Q5), recovery onto the parallel ground edge', () => {
  assert.equal(spec().graph, graph);
  assert.deepEqual(spec().gateHeight, { minHeight: -2, maxHeight: 12 + CAR_HEIGHT });
  assert.deepEqual(Object.keys(spec().noRoad), AIRS);
  for (const id of AIRS) {
    const authored = SKYFALL_COURSE.edges.find(e => e.id === id).gaps;
    const gaps = spec().noRoad[id];
    assert.equal(gaps.length, 1, id);
    assert.ok(Math.abs(gaps[0][0] - authored[0].from) < 1e-6 && Math.abs(gaps[0][1] - authored[0].to) < 1e-6, id);
    assert.ok(gaps[0][0] > 0 && gaps[0][1] < routeLength(graph, id), `${id}: takeoff and landing pads stay solid`);
  }
  assert.deepEqual(spec().recoveryEdge, Object.fromEntries(AIRS.map((id, i) => [id, GROUNDS[i]])));
});

test('Skyfall hazards are the authored obstacles at physical arc length, passed on the far side', () => {
  assert.equal(spec().hazards.length, SKYFALL_OBSTACLES.length);
  for (const o of SKYFALL_OBSTACLES) {
    const h = spec().hazards.find(x => x.id === o.id);
    assert.ok(h, o.id);
    assert.equal(h.edgeId, o.edgeId);
    assert.ok(Math.abs(h.localS - o.distance) < 1e-9, o.id);
    assert.equal(h.lateral, o.lateral);
    assert.equal(h.radius, o.radius);
    assert.equal(h.safePassSide, o.lateral > 0 ? 'left' : 'right');
    assert.ok(h.aiPreview > 0);
  }
});

test('registry: Skyfall is a gated classic course runtime, never in RACE_TRACKS', () => {
  const { track } = entry();
  assert.equal(isCourseRuntime(ID), true);
  assert.equal(raceTrack(ID), track);
  assert.equal(COURSE_TRACKS[ID], track);
  assert.equal(Object.hasOwn(RACE_TRACKS, ID), false);
  assert.throws(() => assertTrackMode(ID, 'time'), { name: 'RangeError', message: 'Skyfall Archipelago is a gated classic sprint' });
  assert.doesNotThrow(() => assertTrackMode(ID, 'classic'));
  assert.equal(upcomingReadiness(ID), 'playable');
});

test('createRace(skyfall-archipelago) attaches the course runtime and no 1D-keyed lists', () => {
  const race = createRace(ID);
  assert.ok(race.course, 'race.course defined');
  assert.equal(race.course.spec, spec());
  assert.deepEqual([...race.course.cars.keys()], ['YOU', ...race.rivals.map(r => r.id)]);
  for (const list of ['rings', 'pickups', 'traffic', 'hazards', 'sections']) assert.deepEqual(race[list], [], list);
  assert.equal(race.length, entry().track.length);
});

// Bot: throttle; holds the lane that picks its branch on each incoming edge; toward a flight edge it drops BOOST on
// the incoming and flight edge and pulses FLY (vertical-speed P-controller holding ~2.5 m) until the gap ends.
const laneFor = (incoming, edge) => [0, -5, 5].find(x => chooseBranchByLateral(graph, incoming, x, 2.5) === edge);
const PATHS = [0, 1, 2, 3, 4, 5, 6, 7].map(bits => [0, 1, 2].map(i => (bits >> i) & 1 ? AIRS[i] : GROUNDS[i]));
function botRace(hz, path, { pilot = true, trace = null } = {}) {
  const race = createRace(ID), dt = 1 / hz;
  startRace(race);
  while (race.phase === 'countdown') stepRace(race, {}, dt);
  const you = race.course.cars.get('YOU'), edges = [you.travel.currentEdgeId], checkpoints = [0];
  const lane = Object.fromEntries(INCOMING.map((id, i) => [id, laneFor(id, path[i])]));
  const towardAir = Object.fromEntries(INCOMING.map((id, i) => [id, AIRS.includes(path[i])]));
  for (let i = 0; race.phase === 'racing' && i < hz * 400; i++) {
    const edge = you.travel.currentEdgeId, air = AIRS.includes(edge), p = race.player;
    p.x = lane[edge] ?? 0;
    const gapEnd = air ? spec().noRoad[edge][0][1] : 0;
    const fly = pilot && air && you.travel.localS < gapEnd && p.verticalSpeed < Math.min(7, 3 * (2.5 - p.altitude));
    stepRace(race, { throttle: true, boost: !(air || towardAir[edge]), fly }, dt);
    trace?.(race, you);
    if (edges.at(-1) !== you.travel.currentEdgeId) edges.push(you.travel.currentEdgeId);
    if (checkpoints.at(-1) !== you.travel.nextCheckpoint) checkpoints.push(you.travel.nextCheckpoint);
  }
  return { race, edges, checkpoints };
}
const expectedEdges = path => ['approach', path[0], 'midway-one', path[1], 'midway-two', path[2], 'descent'];

test('every split has a lane for its ground and its flight edge', () => {
  INCOMING.forEach((id, i) => {
    assert.notEqual(laneFor(id, GROUNDS[i]), undefined, `${id} → ${GROUNDS[i]}`);
    assert.notEqual(laneFor(id, AIRS[i]), undefined, `${id} → ${AIRS[i]}`);
  });
});

// Measured at 60 Hz (no physics change): ground route 162.76 s; one flight edge 151.15-155.14 s, two 139.68-144.13 s,
// all three 132.10 s; lowest altitude over every gap 2.53 m; landings at a/b/c-air 869.9 / 630.8-632.1 / 990.4-991.4 m. The floor sits below the shortest measured path and
// above one that skipped a 2.9 km ground edge (~29 s); the ceiling catches a stall (Dune precedent).
const BOT_MIN = 120, BOT_MAX = 330;
test('all 8 path combinations finish with FLY pulses: a/b/c-merge then FINISH, landing on road only, 0 rejections', () => {
  for (const path of PATHS) {
    const landings = [], label = path.join('/');
    const { race, edges, checkpoints } = botRace(60, path, { trace: (r, you) => {
      const p = r.player;
      if (p.landing && p.landing.time === r.elapsed) landings.push([you.travel.currentEdgeId, you.travel.localS]);
    } });
    assert.equal(race.phase, 'finished', label);
    assert.deepEqual(edges, expectedEdges(path), label);
    assert.deepEqual(checkpoints, [0, 1, 2, 3], `${label}: a-merge, b-merge, c-merge in order`);
    assert.equal(race.course.rejections, 0, label);
    assert.equal(race.player.falls, 0, label);
    for (const [edge, s] of landings) assert.equal(hasSkyfallRoadContact(edge, s), true, `${label}: landed off-road on ${edge} at ${s}`);
    for (const air of path.filter(id => AIRS.includes(id))) {
      assert.ok(landings.some(([edge, s]) => edge === air && s >= spec().noRoad[air][0][1]), `${label}: landed on the ${air} pad`);
    }
    assert.ok(race.result.time >= BOT_MIN && race.result.time <= BOT_MAX, `${label} finish ${race.result.time}s`);
  }
});

const HZ_TOLERANCE = 0.5; // s; measured 162.902 / 162.759 / 162.687 s at 30 / 60 / 120 Hz
test('the ground-route bot finish time agrees at 30, 60 and 120 Hz', () => {
  const times = [30, 60, 120].map(hz => {
    const { race } = botRace(hz, GROUNDS);
    assert.equal(race.phase, 'finished', `${hz} Hz`);
    assert.equal(race.course.rejections, 0, `${hz} Hz`);
    return race.result.time;
  });
  for (const time of times) assert.ok(Math.abs(time - times[1]) <= HZ_TOLERANCE, `30/60/120 Hz: ${times.join(' / ')} s`);
});

test('no FLY: falling in each gap recovers onto the parallel ground edge at the split, never ahead, checkpoints kept', () => {
  AIRS.forEach((air, i) => {
    const path = GROUNDS.map((g, j) => j === i ? air : g);
    let split = null, at = null, before = null;
    const { race } = botRace(60, path, { pilot: false, trace: (r, you) => {
      if (you.travel.currentEdgeId === air && split === null) split = you.edgeStart;
      if (r.player.falls === 1 && at === null) at = { ...you.travel, distance: r.player.distance };
      if (r.player.falls === 0) before = { nextCheckpoint: you.travel.nextCheckpoint };
    } });
    assert.ok(split !== null, `took ${air}`);
    assert.ok(at, `fell in the ${air} gap`);
    assert.equal(at.currentEdgeId, GROUNDS[i]);
    assert.ok(at.localS >= 5 && at.localS <= 65, `recovery slot ${at.localS}`);
    assert.equal(at.nextCheckpoint, before.nextCheckpoint, 'checkpoints unchanged');
    assert.ok(at.distance <= split + 1e-9, `odometer ${at.distance} not ahead of the split ${split}`);
    assert.equal(race.course.rejections, 0);
    assert.equal(race.phase, 'finished', `finishes via ${GROUNDS[i]} after the fall`);
  });
});

test('rivals finish on ground edges only (Q8), with graph standings', () => {
  const race = createRace(ID), course = race.course, seen = new Set();
  startRace(race);
  while (race.phase === 'countdown') stepRace(race, {}, 1 / 60);
  for (let i = 0; i < 60 * 400 && race.rivals.some(r => r.finishTime === null); i++) {
    stepRace(race, {}, 1 / 60); // idle player
    for (const r of race.rivals) seen.add(course.cars.get(r.id).travel.currentEdgeId);
  }
  assert.ok(race.rivals.every(r => r.finishTime !== null), 'all rivals finish');
  for (const air of AIRS) assert.equal(seen.has(air), false, `no rival on ${air}`);
  assert.equal(course.rejections, 0);
  assert.equal(course.standings.find(s => s.id === 'YOU').place, 8);
});

test('an authored Skyfall obstacle collides through the shared hazard path; its safe side is clear', () => {
  const hazard = spec().hazards.find(h => h.edgeId === 'a-ground');
  const drive = x => {
    const race = createRace(ID);
    race.phase = 'racing';
    const odometer = routeLength(graph, 'approach') + hazard.localS - 20;
    Object.assign(race.player, { distance: odometer, x, speed: 60 });
    placeCourseCar(race.course, 'YOU', 'a-ground', hazard.localS - 20, { distance: odometer, x, altitude: 0 });
    for (let i = 0; i < 40; i++) { race.player.x = x; stepRace(race, { throttle: true }, 1 / 60); }
    return race.player.collisions;
  };
  assert.equal(drive(hazard.lateral), 1);
  assert.equal(drive(-hazard.lateral), 0, 'the safe side passes');
});

test('Skyfall records live under one topology-keyed id; no Ghost; rules accept the best', () => {
  const KEY = 'skyfall-archipelago@t1l1';
  assert.equal(recordTrackId(ID), KEY);
  assert.deepEqual(recordTrackIds(ID), [KEY]);
  assert.deepEqual(parseRecordTrackId(KEY), { trackId: ID, layout: 1 });
  const time = 60, samples = Array.from({ length: time * GHOST_RATE + 1 }, (_, i) => [i, 0, 0]);
  assert.equal(validGhost({ time, samples }, ID), false);
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const listed = [...rules.match(/function bestIds\(\) \{[^}]*\}/)[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(listed.includes(KEY));
  assert.match(rules, new RegExp(`validBest\\(bests, '${KEY}'\\)`));
});
