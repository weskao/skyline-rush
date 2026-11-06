import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { createCourseTravel, courseTravelPosition } from '../src/course-travel.ts';
import { advanceMeasuredCourseTravel } from '../src/course-measured-motion.ts';
import { DUNE_TEMPEST_COURSE, DUNE_TEMPEST_GATES, DUNE_TEMPEST_GRAPH } from '../src/courses/dune-tempest.ts';
import { duneSurfaceIntervals, buildDuneRoadChunk } from '../src/courses/dune-tempest-geometry.ts';
import { PLAYABLE_COURSE_GRAPH as graph, DUNE_TEMPEST_RUNTIME_METADATA as metadata }
  from '../src/courses/dune-tempest-runtime-adapter.ts';

const edgeById = id => graph.edges.find(edge => edge.id === id);

test('exposes the original authored Dune graph through the canonical validator', () => {
  assert.equal(graph, DUNE_TEMPEST_GRAPH);
  assert.equal(validateCourseGraph(graph), graph);
  assert.equal(graph.id, 'dune-tempest');
  assert.deepEqual(graph.checkpoints, ['cp1', 'cp2', 'cp3', 'cp4']);
  assert.equal(graph.nodes.length, 12);
  assert.equal(graph.edges.length, 14);
});

test('provides a physically continuous, checkpoint-ordered ground-only path', () => {
  let at = graph.start;
  const visited = [];
  for (const id of graph.groundRoute) {
    const edge = edgeById(id);
    assert.equal(edge.from, at, id);
    assert.equal(edge.mode, 'ground', id);
    assert.deepEqual(edge.points[0], graph.nodes.find(node => node.id === edge.from).at);
    assert.deepEqual(edge.points.at(-1), graph.nodes.find(node => node.id === edge.to).at);
    visited.push(edge.to);
    at = edge.to;
  }
  assert.equal(at, graph.finish);
  assert.deepEqual(visited.filter(id => graph.checkpoints.includes(id)), graph.checkpoints);
  assert.ok(graph.groundRoute.length > 8);
});

test('keeps the real curved 3D control points, width and physical arc lengths', () => {
  for (const edge of graph.edges) {
    const authored = DUNE_TEMPEST_COURSE.edges.find(candidate => candidate.id === edge.id);
    assert.equal(edge.points, authored.controlPoints, edge.id);
    assert.equal(edge.width, authored.widthMeters, edge.id);
    const length = routeLength(graph, edge.id);
    const straight = Math.hypot(...edge.points.at(-1).map((value, i) => value - edge.points[0][i]));
    assert.ok(length + 1e-5 >= straight && Number.isFinite(length), edge.id);
    const start = sampleRoute(graph, edge.id, 0), end = sampleRoute(graph, edge.id, length);
    assert.ok(Math.hypot(...start.point.map((value, i) => value - edge.points[0][i])) < 0.01, edge.id);
    assert.ok(Math.hypot(...end.point.map((value, i) => value - edge.points.at(-1)[i])) < 0.01, edge.id);
    assert.equal(start.width, edge.width, edge.id);
  }
  assert.ok(routeLength(graph, 'canyon-switchbacks') > routeLength(graph, 'canyon-air-crossing'));
});

test('road mesh chunks meet exactly along the canonical curved 3D canyon frame', () => {
  const id = 'canyon-switchbacks';
  const edge = edgeById(id);
  const sampler = (edgeId, localS) => sampleRoute(graph, edgeId, localS);
  const first = buildDuneRoadChunk(sampler, id, 0, 60, edge.width, 10);
  const second = buildDuneRoadChunk(sampler, id, 60, 120, edge.width, 10);
  const vertex = (chunk, row, column) => chunk.positions.slice((row * 4 + column) * 3, (row * 4 + column) * 3 + 3);
  for (let column = 0; column < 4; column++) {
    assert.deepEqual(vertex(first, 6, column), vertex(second, 0, column));
  }
  assert.equal(first.roadIndices.length, 36);
  assert.equal(first.shoulderIndices.length, 72);
  assert.ok(new Set(first.positions.filter((_, index) => index % 3 === 1).map(y => y.toFixed(2))).size > 1,
    'road ribbon must follow the actual curved/graded route');
});

test('preserves four real hairpin indices, ordered gate planes, hazards and recovery zones', () => {
  assert.equal(metadata.hairpins, DUNE_TEMPEST_COURSE.hairpins);
  assert.equal(metadata.gates, DUNE_TEMPEST_GATES);
  assert.equal(metadata.hazards, DUNE_TEMPEST_COURSE.hazards);
  assert.equal(metadata.offroadZones, DUNE_TEMPEST_COURSE.offroadZones);
  assert.equal(metadata.hairpins.length, 4);
  for (const hairpin of metadata.hairpins) {
    assert.equal(hairpin.edgeId, 'canyon-switchbacks');
    assert.ok(hairpin.apexControlIndex > 0 && hairpin.apexControlIndex < edgeById(hairpin.edgeId).points.length - 1);
  }
  assert.deepEqual(metadata.gates.map(gate => gate.nodeId), [...graph.checkpoints, graph.finish]);
});

test('retains airborne canyon gap, real landing pads and valid ground recovery fallback', () => {
  assert.equal(metadata.flightShortcuts.length, 1);
  const flight = metadata.flightShortcuts[0];
  const edge = edgeById(flight.edgeId);
  const fallback = edgeById(flight.recoveryEdgeId);
  assert.equal(edge.mode, 'flight');
  assert.equal(flight.edgeId, 'canyon-air-crossing');
  assert.equal(flight.recoveryEdgeId, 'canyon-switchbacks');
  assert.equal(fallback.mode, 'ground');
  assert.deepEqual([fallback.from, fallback.to], [edge.from, edge.to]);
  assert.equal(flight.lengthMeters, routeLength(graph, flight.edgeId));
  assert.deepEqual(flight.solidRoadIntervals,
    duneSurfaceIntervals(0, flight.lengthMeters, flight.lengthMeters, 60, flight.landing.clearLengthMeters));
  assert.deepEqual(flight.solidRoadIntervals[0], [0, 60]);
  assert.equal(flight.solidRoadIntervals[1][1], flight.lengthMeters);
  assert.ok(flight.solidRoadIntervals[0][1] < flight.solidRoadIntervals[1][0], 'air gap must stay non-solid');
});

test('rejects forged flight checkpoint bypass and disconnected route changes', () => {
  const original = edgeById('canyon-air-crossing');
  const forged = {
    ...graph, edges: [...graph.edges, { ...original, id: 'forged-finish', to: 'finish',
      points: [original.points[0], graph.nodes.find(n => n.id === 'finish').at] }],
  };
  assert.throws(() => validateCourseGraph(forged), /checkpoint bypass/);
  assert.throws(() => validateCourseGraph({ ...graph, groundRoute: ['canyon-air-crossing'] }), /ground route/);
});

test('shared measured travel refuses a teleport, unauthorized flight and false edge transition', () => {
  const state = createCourseTravel(graph);
  const next = { ...state, localS: 12 };
  const legitimate = {
    edgeId: state.currentEdgeId, fromS: 0, toS: 12,
    fromPosition: courseTravelPosition(graph, state), toPosition: courseTravelPosition(graph, next),
    maxStepMetres: 20,
  };
  assert.equal(advanceMeasuredCourseTravel(graph, state, legitimate).localS, 12);
  assert.deepEqual(advanceMeasuredCourseTravel(graph, state,
    { ...legitimate, maxStepMetres: 4 }), state, 'oversized physical movement');
  assert.deepEqual(advanceMeasuredCourseTravel(graph, state,
    { ...legitimate, toPosition: [10000, 20000, -5000] }), state, 'teleporting world pose');
  assert.deepEqual(advanceMeasuredCourseTravel(graph, state,
    { ...legitimate, nextEdgeId: 'canyon-air-crossing' }), state, 'disconnected edge change');
  const airborne = { ...state, currentEdgeId: 'canyon-air-crossing', localS: 5 };
  assert.deepEqual(advanceMeasuredCourseTravel(graph, airborne, {
    edgeId: airborne.currentEdgeId, fromS: 5, toS: 8,
    fromPosition: courseTravelPosition(graph, airborne),
    toPosition: courseTravelPosition(graph, { ...airborne, localS: 8 }), maxStepMetres: 5,
  }), airborne, 'flight must be authorized by trusted physics');
});
