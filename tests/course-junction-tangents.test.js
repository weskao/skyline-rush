import test from 'node:test';
import assert from 'node:assert/strict';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { PLAYABLE_COURSE_GRAPH as dune } from '../src/courses/dune-tempest-runtime-adapter.ts';
import * as duneCourse from '../src/courses/dune-tempest.ts';

// Spec §17 Q9: every junction is tangent-continuous; only tangent data near nodes may move.
const MAX_HEADING_DEG = 1;
const heading = frame => Math.atan2(frame.forward[0], -frame.forward[2]);
const headingDelta = (a, b) => {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return Math.min(d, 2 * Math.PI - d) * 180 / Math.PI;
};
const connectedPairs = graph => graph.edges.flatMap(a =>
  graph.edges.filter(b => b.from === a.to).map(b => [a, b]));

test('Dune: every connected edge pair meets with a horizontal heading change <= 1 degree', () => {
  const pairs = connectedPairs(dune);
  assert.equal(pairs.length, 16);
  const kinks = pairs.map(([a, b]) => ({
    pair: `${a.id} -> ${b.id}`,
    degrees: headingDelta(heading(sampleRoute(dune, a.id, routeLength(dune, a.id))),
      heading(sampleRoute(dune, b.id, 0))),
  })).filter(k => !(k.degrees <= MAX_HEADING_DEG));
  assert.deepEqual(kinks, []);
});

test('Dune smoothing keeps node positions, edge ids, endpoints, modes and checkpoints of 0c951d49', () => {
  assert.deepEqual(Object.fromEntries(dune.nodes.map(n => [n.id, n.at])), {
    start: [0, 8, 0], cp1: [257, 8, -866], split1: [770, 8, -1155], merge1: [641, 8, -2052],
    cp2: [160, 12, -2694], split2: [-449, 12, -2822], merge2: [-609, 10, -3848],
    cp3: [-962, 10, -4522], split3: [-802, 10, -4907], merge3: [-321, 10, -5452],
    cp4: [353, 10, -6061], finish: [930, 8, -6927],
  });
  assert.deepEqual(dune.edges.map(e => [e.id, e.from, e.to, e.mode]), [
    ['sunset-start', 'start', 'cp1', 'ground'], ['dune-s-bends', 'cp1', 'split1', 'ground'],
    ['winding-wadi', 'split1', 'merge1', 'ground'], ['dune-crest-cut', 'split1', 'merge1', 'ground'],
    ['rock-gate-descent', 'merge1', 'cp2', 'ground'], ['canyon-approach', 'cp2', 'split2', 'ground'],
    ['canyon-switchbacks', 'split2', 'merge2', 'ground'],
    ['canyon-air-crossing', 'split2', 'merge2', 'flight'],
    ['stone-ring-corridor', 'merge2', 'cp3', 'ground'], ['sandstorm-climb', 'cp3', 'split3', 'ground'],
    ['natural-arch-pass', 'split3', 'merge3', 'ground'], ['dry-wash-cut', 'split3', 'merge3', 'ground'],
    ['stone-ring-outlet', 'merge3', 'cp4', 'ground'], ['finish-sprint', 'cp4', 'finish', 'ground'],
  ]);
  assert.deepEqual(dune.checkpoints, ['cp1', 'cp2', 'cp3', 'cp4']);
  for (const edge of dune.edges) {
    assert.deepEqual(edge.points[0], dune.nodes.find(n => n.id === edge.from).at, edge.id);
    assert.deepEqual(edge.points.at(-1), dune.nodes.find(n => n.id === edge.to).at, edge.id);
  }
});

test('Dune hazards keep their edge fraction and stay outside every junction blend span', () => {
  const course = duneCourse.DUNE_TEMPEST_COURSE;
  assert.deepEqual(course.hazards.map(h => [h.id, h.edgeId, h.atFraction]), [
    ['fall-a', 'rock-gate-descent', .43], ['rock-b', 'winding-wadi', .65],
    ['gravel-a', 'dune-s-bends', .58], ['sand-bowl-a', 'sunset-start', .55],
    ['rock-c', 'canyon-switchbacks', .17], ['fall-d', 'canyon-switchbacks', .48],
    ['gravel-e', 'stone-ring-corridor', .62], ['sand-pit-f', 'dry-wash-cut', .35],
    ['rock-g', 'natural-arch-pass', .71],
  ]);
  const blends = duneCourse.DUNE_JUNCTION_BLEND_METERS;
  assert.ok(blends, 'map exports the measured junction blend spans');
  // Blend spans are authored-arc metres; the S-curve is at most a few % longer, so allow 10 %.
  for (const hazard of course.hazards) {
    const length = routeLength(dune, hazard.edgeId), at = hazard.atFraction * length;
    const [head, tail] = blends[hazard.edgeId];
    assert.ok(at - hazard.collisionRadiusMeters > head * 1.1, hazard.id + ' clear of start blend');
    assert.ok(at + hazard.collisionRadiusMeters < length - tail * 1.1, hazard.id + ' clear of end blend');
  }
});
