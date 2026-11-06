import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { PLAYABLE_COURSE_GRAPH as DUNE } from '../src/courses/dune-tempest-runtime-adapter.ts';
import {
  chooseBranchByLateral, courseCarGap, courseNoRoadAt, createCourseRuntime, placeCourseCar,
  rankCourseRuntime, stepCourseCar,
} from '../src/course-race.ts';

const SPEC = { graph: DUNE, gateHeight: { minHeight: -6, maxHeight: 22 }, noRoad: {}, recoveryEdge: {}, hazards: [] };
const IDS = ['YOU', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
const GRID = IDS.map((id, i) => ({ id, distance: 24 - i * 3, x: i % 2 ? -2.5 : 2.5 }));
const MAX_STEP = 11.8; // spec §5.2: 118 m/s × 0.1 s
// Measured after Task 1A smoothing: the ground route's physical length, not a pre-smoothing literal.
const GROUND_TOTAL = DUNE.groundRoute.reduce((sum, id) => sum + routeLength(DUNE, id), 0);
const groundEdgeFrom = node => DUNE.groundRoute.find(id => DUNE.edges.find(e => e.id === id).from === node) ?? null;
const near = (a, b, tol) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

function drive(x, step) {
  const rt = createCourseRuntime(SPEC, [{ id: 'YOU', distance: 24, x }]);
  const car = rt.cars.get('YOU'), edges = [car.travel.currentEdgeId], checkpoints = [0];
  let distance = 24, event = 'moved', finishOdometer = null;
  for (let n = 0; n < 40000 && event !== 'finished' && event !== 'rejected'; n++) {
    const previous = distance;
    distance += step;
    event = stepCourseCar(rt, 'YOU', { distance, x, altitude: 0 }, MAX_STEP, groundEdgeFrom);
    if (edges.at(-1) !== car.travel.currentEdgeId) edges.push(car.travel.currentEdgeId);
    if (checkpoints.at(-1) !== car.travel.nextCheckpoint) checkpoints.push(car.travel.nextCheckpoint);
    if (event === 'finished') finishOdometer = previous + car.finishFraction * step;
  }
  return { rt, car, edges, checkpoints, event, finishOdometer };
}

test('createCourseRuntime places every grid car on the start edge at its odometer and lane', () => {
  const rt = createCourseRuntime(SPEC, GRID);
  assert.equal(rt.cars.size, 8);
  assert.equal(rt.rejections, 0);
  for (const slot of GRID) {
    const car = rt.cars.get(slot.id), frame = sampleRoute(DUNE, 'sunset-start', slot.distance);
    assert.equal(car.travel.currentEdgeId, 'sunset-start');
    assert.equal(car.travel.localS, slot.distance);
    assert.equal(car.finishFraction, null);
    const expected = frame.point.map((p, i) => p + slot.x * frame.right[i]);
    assert.ok(near(car.pose.point, expected, 1e-6), `${slot.id} pose ${car.pose.point} vs ${expected}`);
    assert.ok(near(car.pose.forward, frame.forward, 1e-9));
  }
  assert.equal(rt.standings.length, 8);
});

test('driving the ground route at 60 Hz visits groundRoute in order and finishes at its measured length', () => {
  const { rt, edges, checkpoints, event, finishOdometer } = drive(0, 1.5);
  assert.deepEqual(edges, [...DUNE.groundRoute]);
  assert.deepEqual(checkpoints, [0, 1, 2, 3, 4]);
  assert.equal(event, 'finished');
  assert.ok(Math.abs(finishOdometer - GROUND_TOTAL) < 0.5, `finish ${finishOdometer} vs ${GROUND_TOTAL}`);
  assert.equal(rt.rejections, 0);
});

test('lane ±10 m and 30/60/120 Hz steps give the same edges and finish odometer', () => {
  const runs = [];
  for (const x of [-10, 0, 10]) for (const step of [3.0, 1.5, 0.75]) runs.push({ x, step, ...drive(x, step) });
  for (const run of runs) {
    assert.equal(run.event, 'finished', `x ${run.x} step ${run.step}`);
    assert.equal(run.rt.rejections, 0, `x ${run.x} step ${run.step}`);
    assert.deepEqual(run.edges, [...DUNE.groundRoute], `x ${run.x} step ${run.step}`);
    assert.ok(Math.abs(run.finishOdometer - runs[0].finishOdometer) < 0.5,
      `x ${run.x} step ${run.step}: ${run.finishOdometer} vs ${runs[0].finishOdometer}`);
  }
});

test('a car 6–12 m in the air collects cp2; above the gate band it is rejected and unchanged', () => {
  const length = routeLength(DUNE, 'rock-gate-descent');
  for (const altitude of [6, 9, 12]) {
    const rt = createCourseRuntime(SPEC, GRID);
    placeCourseCar(rt, 'YOU', 'rock-gate-descent', length - 1, { distance: 5000, x: 0, altitude });
    assert.equal(rt.cars.get('YOU').travel.nextCheckpoint, 1);
    const event = stepCourseCar(rt, 'YOU', { distance: 5001.5, x: 0, altitude }, MAX_STEP, groundEdgeFrom);
    const travel = rt.cars.get('YOU').travel;
    assert.equal(event, 'crossed', `altitude ${altitude}`);
    assert.equal(travel.currentEdgeId, 'canyon-approach');
    assert.equal(travel.nextCheckpoint, 2);
    assert.ok(Math.abs(travel.localS - 0.5) < 1e-6);
    assert.ok(Math.abs(rt.cars.get('YOU').edgeStart + 0.5 - 5001.5) < 1e-6);
  }
  const rt = createCourseRuntime(SPEC, GRID);
  placeCourseCar(rt, 'YOU', 'rock-gate-descent', length - 1, { distance: 5000, x: 0, altitude: 30 });
  const before = rt.cars.get('YOU').travel;
  assert.equal(stepCourseCar(rt, 'YOU', { distance: 5001.5, x: 0, altitude: 30 }, MAX_STEP, groundEdgeFrom), 'rejected');
  assert.equal(rt.cars.get('YOU').travel, before);
  assert.equal(rt.rejections, 1);
});

test('chooseBranchByLateral takes the side of the car; inside the deadband the ground route', () => {
  const split1 = DUNE.edges.filter(e => e.from === 'split1').map(e => e.id).sort();
  const left = chooseBranchByLateral(DUNE, 'dune-s-bends', -5, 2.5);
  const right = chooseBranchByLateral(DUNE, 'dune-s-bends', 5, 2.5);
  assert.notEqual(left, right);
  assert.deepEqual([left, right].sort(), split1);
  assert.equal(chooseBranchByLateral(DUNE, 'dune-s-bends', 0, 2.5), 'winding-wadi');
  assert.equal(chooseBranchByLateral(DUNE, 'dune-s-bends', 2.4, 2.5), 'winding-wadi');
  // Left really is left of the incoming end frame, 30 m past the node.
  const end = sampleRoute(DUNE, 'dune-s-bends', routeLength(DUNE, 'dune-s-bends'));
  const turn = id => sampleRoute(DUNE, id, 30).point.reduce((s, p, i) => s + (p - end.point[i]) * end.right[i], 0);
  assert.ok(turn(left) < turn(right));
  assert.equal(chooseBranchByLateral(DUNE, 'sunset-start', -8, 2.5), 'dune-s-bends');
  assert.equal(chooseBranchByLateral(DUNE, 'finish-sprint', 0, 2.5), null);
});

test('courseCarGap: same edge, adjacent edges across a merge, and parallel branches', () => {
  const rt = createCourseRuntime(SPEC, GRID);
  const at = (id, edge, s, distance) => placeCourseCar(rt, id, edge, s, { distance, x: 0, altitude: 0 });
  at('R1', 'sunset-start', 100, 100); at('R2', 'sunset-start', 104, 104);
  assert.equal(courseCarGap(rt, 'R1', 'R2'), 4);
  assert.equal(courseCarGap(rt, 'R2', 'R1'), -4);
  at('R3', 'winding-wadi', 500, 2445); at('R4', 'dune-crest-cut', 500, 2445);
  assert.equal(courseCarGap(rt, 'R3', 'R4'), null);
  at('R5', 'dune-crest-cut', routeLength(DUNE, 'dune-crest-cut') - 2, 2898); at('R6', 'rock-gate-descent', 1, 2901);
  assert.ok(Math.abs(courseCarGap(rt, 'R5', 'R6') - 3) < 0.01);
  assert.ok(Math.abs(courseCarGap(rt, 'R6', 'R5') + 3) < 0.01);
  assert.equal(courseCarGap(rt, 'R1', 'R6'), null);
});

test('rankCourseRuntime: a shorter branch near merge1 outranks a larger odometer on the long branch', () => {
  const rt = createCourseRuntime(SPEC, GRID);
  placeCourseCar(rt, 'R1', 'dune-crest-cut', 950, { distance: 2895, x: 0, altitude: 0 });
  placeCourseCar(rt, 'R2', 'winding-wadi', 1000, { distance: 2945, x: 0, altitude: 0 });
  const standings = rankCourseRuntime(rt, {});
  assert.equal(rt.standings, standings);
  const place = id => standings.find(s => s.id === id).place;
  assert.ok(place('R1') < place('R2'), JSON.stringify(standings));
});

test('flight edge: the takeoff pad authorizes a grounded car; the gap is reported as no road', () => {
  const air = 'canyon-air-crossing', length = routeLength(DUNE, air);
  const rt = createCourseRuntime({ ...SPEC, noRoad: { [air]: [[60, length - 105]] } }, GRID);
  const approach = routeLength(DUNE, 'canyon-approach');
  placeCourseCar(rt, 'YOU', 'canyon-approach', approach - 1, { distance: 4000, x: 0, altitude: 0 });
  assert.equal(stepCourseCar(rt, 'YOU', { distance: 4001.5, x: 0, altitude: 0 }, MAX_STEP, () => air), 'crossed');
  assert.equal(rt.cars.get('YOU').travel.currentEdgeId, air);
  assert.equal(courseNoRoadAt(rt, 'YOU'), false);
  placeCourseCar(rt, 'YOU', air, 55, { distance: 5000, x: 0, altitude: 0 });
  assert.equal(stepCourseCar(rt, 'YOU', { distance: 5006, x: 0, altitude: 0 }, MAX_STEP, () => null), 'moved');
  assert.equal(courseNoRoadAt(rt, 'YOU'), true);
  assert.equal(rt.rejections, 0);
});

test('no dead window before a node: a car stopped within 1e-6 m of the plane still crosses it', () => {
  const length = routeLength(DUNE, 'sunset-start');
  // Reached by an in-edge step whose odometer lands in [length − 1e-6, length).
  const stepped = createCourseRuntime(SPEC, GRID);
  placeCourseCar(stepped, 'YOU', 'sunset-start', length - 1, { distance: 5000, x: 4, altitude: 0 });
  assert.equal(stepCourseCar(stepped, 'YOU', { distance: 5001 - 5e-7, x: 4, altitude: 0 }, MAX_STEP, groundEdgeFrom), 'moved');
  assert.equal(stepCourseCar(stepped, 'YOU', { distance: 5002.5, x: 4, altitude: 0 }, MAX_STEP, groundEdgeFrom), 'crossed');
  // Placed there directly (recovery / test placement).
  const placed = createCourseRuntime(SPEC, GRID);
  placeCourseCar(placed, 'YOU', 'sunset-start', length - 5e-7, { distance: 5000, x: 4, altitude: 0 });
  assert.equal(stepCourseCar(placed, 'YOU', { distance: 5001.5, x: 4, altitude: 0 }, MAX_STEP, groundEdgeFrom), 'crossed');
  for (const rt of [stepped, placed]) {
    const travel = rt.cars.get('YOU').travel;
    assert.equal(travel.currentEdgeId, 'dune-s-bends');
    assert.equal(travel.nextCheckpoint, 1);
    assert.equal(rt.rejections, 0);
  }
  // The odometer mapping is untouched by the clamp: overflow lands 1.5 m (resp. 1.5 − 5e-7 m) into the next edge.
  assert.ok(Math.abs(stepped.cars.get('YOU').travel.localS - 1.5) < 1e-9);
  assert.ok(Math.abs(placed.cars.get('YOU').travel.localS - (1.5 - 5e-7)) < 1e-9);
});

test('car.last is a per-car copy: mutating the caller object after a step changes nothing', () => {
  const rt = createCourseRuntime(SPEC, GRID), car = rt.cars.get('YOU'), last = car.last;
  const now = { distance: 25.5, x: 1, altitude: 0 };
  assert.equal(stepCourseCar(rt, 'YOU', now, MAX_STEP, groundEdgeFrom), 'moved');
  now.distance = 999; now.x = -9; now.altitude = 7;
  assert.deepEqual({ ...car.last }, { distance: 25.5, x: 1, altitude: 0 });
  assert.equal(car.last, last, 'preallocated object reused, not replaced');
  const placed = { distance: 400, x: 2, altitude: 0 };
  placeCourseCar(rt, 'YOU', 'sunset-start', 400, placed);
  placed.x = 8;
  assert.deepEqual({ ...car.last }, { distance: 400, x: 2, altitude: 0 });
  assert.equal(car.last, last);
});
