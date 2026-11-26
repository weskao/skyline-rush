import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { courseCarGap, createCourseRuntime } from '../src/course-race.ts';
import { DUNE_TEMPEST_RACE } from '../src/courses/dune-tempest-race.ts';

// Wave 1 / workstream 14: route and gap lookups resolve an edge id through a per-graph index, never a per-call scan
// of graph.edges. Counting `id` reads on instrumented edges proves the scan is gone and first-match semantics hold.
function instrument(graph) {
  const reads = { n: 0 };
  const edges = graph.edges.map(edge => {
    const copy = Object.create(edge); // inherits points/from/to; id is an own counting getter
    Object.defineProperty(copy, 'id', { get() { reads.n++; return edge.id; } });
    return copy;
  });
  return { graph: { ...graph, edges }, reads };
}

test('routeLength and sampleRoute index edge ids once per graph', () => {
  const { graph, reads } = instrument(DUNE_TEMPEST_RACE.graph);
  const id = graph.groundRoute.at(-1);
  routeLength(graph, id);
  const afterFirst = reads.n;
  for (let i = 0; i < 200; i++) { routeLength(graph, id); sampleRoute(graph, id, 1 + i); }
  assert.equal(reads.n, afterFirst, `edge ids re-scanned ${reads.n - afterFirst} times after the index was built`);
});

test('unknown edge ids still throw and duplicate ids resolve to the first edge', () => {
  const g = { edges: [
    { id: 'a', from: 'n0', to: 'n1', points: [[0, 0, 0], [0, 0, -10], [0, 0, -20]], width: 24, mode: 'ground' },
    { id: 'a', from: 'n1', to: 'n2', points: [[0, 0, 0], [0, 0, -50], [0, 0, -100]], width: 24, mode: 'ground' },
  ] };
  assert.ok(Math.abs(routeLength(g, 'a') - 20) < 1e-6);
  assert.throws(() => routeLength(g, 'missing'), RangeError);
});

test('courseCarGap does not scan the edge list per call', () => {
  const { graph, reads } = instrument(DUNE_TEMPEST_RACE.graph);
  const rt = createCourseRuntime({ ...DUNE_TEMPEST_RACE, graph }, [{ id: 'YOU', distance: 0, x: 0 }, { id: 'B', distance: 20, x: 0 }]);
  courseCarGap(rt, 'YOU', 'B');
  const afterFirst = reads.n;
  for (let i = 0; i < 200; i++) courseCarGap(rt, 'YOU', 'B');
  assert.equal(reads.n, afterFirst);
});

// carGap is the O(cars^2) inner call of AI avoidance and bumping: one Map lookup per car, not two.
import { createRace, startRace, stepRace } from '../src/game.js';
import { carGap } from '../src/course-race-step.ts';

function dune() {
  const race = createRace('dune-tempest'); startRace(race);
  while (race.phase === 'countdown') stepRace(race, {}, 1 / 60);
  for (let i = 0; i < 10; i++) stepRace(race, { up: true }, 1 / 60);
  return race;
}
test('carGap looks each car up once', () => {
  const race = dune(), cars = race.course.cars, get = cars.get.bind(cars);
  let gets = 0; cars.get = id => { gets++; return get(id); };
  const before = gets;
  carGap(race, race.player, race.rivals[0]);
  assert.equal(gets - before, 2);
});

test('rival item sweeps never read items on edges the rival did not cross', () => {
  const race = dune(), reads = { n: 0 };
  const onCars = new Set([...race.course.cars.values()].map(car => car.travel.currentEdgeId));
  let far = 0;
  for (const item of [...race.rings, ...race.pickups]) {
    if (onCars.has(item.edgeId)) continue;
    far++;
    const localS = item.localS; Object.defineProperty(item, 'localS', { get() { reads.n++; return localS; }, configurable: true });
  }
  assert.ok(far > 20, 'fixture must have items off every car edge');
  stepRace(race, { up: true }, 1 / 60);
  assert.equal(reads.n, 0);
});
