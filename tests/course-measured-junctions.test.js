import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseTravelPosition } from '../src/course-travel.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { advanceMeasuredCourseTravel } from '../src/course-measured-motion.ts';
import { PLAYABLE_COURSE_GRAPH as DUNE } from '../src/courses/dune-tempest-runtime-adapter.ts';
import { PLAYABLE_COURSE_GRAPH as SKYFALL } from '../src/courses/skyfall-archipelago-runtime-adapter.ts';

const GATE = { minHeight: -2, maxHeight: 13.2 };
const MAX_STEP = 11.8; // spec §5.2: 118 m/s top speed × 0.1 s max dt
const LATERALS = [-10, 0, 10];
const OVERFLOWS = [0.5, 1.5, 3.0]; // ≈ 30/60/120 Hz at 90 m/s

const junctions = graph => graph.edges.flatMap(a =>
  graph.edges.filter(b => b.from === a.to).map(b => [a, b]));
// Correct order on edge `a`: the first checkpoint still reachable from its end node.
function nextCheckpointOn(graph, a) {
  const reach = new Set([a.to]);
  for (let grew = true; grew;) {
    grew = false;
    for (const e of graph.edges) if (reach.has(e.from) && !reach.has(e.to)) { reach.add(e.to); grew = true; }
  }
  return graph.checkpoints.findIndex(id => reach.has(id));
}
const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k, p[2] + v[2] * k];

function crossing(graph, a, b, lateral, overflow, altitude = 0) {
  const length = routeLength(graph, a.id);
  const state = { currentEdgeId: a.id, nextCheckpoint: nextCheckpointOn(graph, a), finished: false,
    localS: length - 0.8, lateral, altitude };
  const frame = sampleRoute(graph, b.id, overflow);
  const motion = { edgeId: a.id, fromS: state.localS, toS: length + overflow,
    fromPosition: courseTravelPosition(graph, state),
    toPosition: add(add(frame.point, frame.right, lateral), frame.up, altitude),
    maxStepMetres: MAX_STEP, nextEdgeId: b.id, flightAuthorized: true, gateHeight: GATE };
  return { state, motion };
}

for (const graph of [DUNE, SKYFALL]) {
  test(`${graph.id}: every junction carries road-frame lateral across the node`, () => {
    const failures = [];
    for (const [a, b] of junctions(graph)) for (const lateral of LATERALS) for (const overflow of OVERFLOWS) {
      const { state, motion } = crossing(graph, a, b, lateral, overflow);
      const next = advanceMeasuredCourseTravel(graph, state, motion);
      const ok = next !== state && next.currentEdgeId === b.id &&
        Math.abs(next.localS - overflow) < 0.05 && Math.abs(next.lateral - lateral) < 1e-6;
      if (!ok) failures.push(`${a.id} → ${b.id} lateral ${lateral} overflow ${overflow}: ` +
        (next === state ? 'rejected' : `edge ${next.currentEdgeId} localS ${next.localS.toFixed(3)} lateral ${next.lateral.toFixed(6)}`));
    }
    assert.deepEqual(failures, []);
  });

  test(`${graph.id}: reverse sweep, wrong next edge, skipped checkpoint and 20 m altitude stay rejected`, () => {
    for (const [a, b] of junctions(graph)) {
      const { state, motion } = crossing(graph, a, b, 0, 1.5);
      const behind = courseTravelPosition(graph, { ...state, localS: state.localS - 1.6 });
      assert.equal(advanceMeasuredCourseTravel(graph, state, { ...motion, toPosition: behind }), state, `${a.id} reverse`);
      const wrong = graph.edges.find(e => e.from !== a.to);
      assert.equal(advanceMeasuredCourseTravel(graph, state, { ...motion, nextEdgeId: wrong.id }), state, `${a.id} wrong next`);
      if (graph.checkpoints.includes(a.to)) {
        const skipped = { ...state, nextCheckpoint: state.nextCheckpoint + 1 };
        assert.equal(advanceMeasuredCourseTravel(graph, skipped, motion), skipped, `${a.id} skipped checkpoint`);
      }
      const high = crossing(graph, a, b, 0, 1.5, 20);
      assert.equal(advanceMeasuredCourseTravel(graph, high.state, high.motion), high.state, `${a.id} → ${b.id} altitude 20`);
    }
  });

  test(`${graph.id}: authorized flight crosses a ground junction inside the gate band; unauthorized does not`, () => {
    const failures = [];
    for (const [a, b] of junctions(graph).filter(([, b]) => b.mode === 'ground')) {
      const { state, motion } = crossing(graph, a, b, 0, 1.5, 9);
      const next = advanceMeasuredCourseTravel(graph, state, motion);
      if (next === state || next.currentEdgeId !== b.id || Math.abs(next.altitude - 9) > 1e-6)
        failures.push(`${a.id} → ${b.id} authorized 9 m: ${next === state ? 'rejected' : `altitude ${next.altitude}`}`);
      if (advanceMeasuredCourseTravel(graph, state, { ...motion, flightAuthorized: false }) !== state)
        failures.push(`${a.id} → ${b.id} unauthorized 9 m accepted`);
    }
    assert.deepEqual(failures, []);
  });
}
