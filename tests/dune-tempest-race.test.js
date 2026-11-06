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
