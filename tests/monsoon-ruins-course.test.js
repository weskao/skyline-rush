import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MONSOON_RUINS_COURSE as course,
  sampleMonsoonRoute,
  monsoonWetContact,
  monsoonObstacleHit,
  monsoonAvoidance,
  monsoonPassedCheckpoints,
  monsoonCanFinish,
  monsoonRecovery,
  validateMonsoonCourse,
} from '../src/courses/monsoon-ruins.ts';

const near = (a, b, eps = 0.08) => assert.ok(Math.abs(a - b) <= eps, `${a} differs from ${b}`);
const separation = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
const main = s => sampleMonsoonRoute('ground', s);

test('point-to-point course owns one distinct start and finish with validated branches', () => {
  assert.equal(course.id, 'monsoon-ruins');
  assert.equal(course.start, 'start');
  assert.equal(course.finish, 'finish');
  assert.ok(course.length >= 12000 && course.length <= 13000);
  assert.ok(separation(main(0).point, main(course.length).point) > 1000);
  assert.equal(validateMonsoonCourse(), true);
  assert.equal(course.branches.length, 3);
  assert.ok(course.branches.some(edge => edge.mode === 'air'));
  assert.ok(course.branches.every(edge => edge.from < edge.to && edge.from > 0 && edge.to < course.length));
});

test('ground road frames are finite and continuous on both large hairpins', () => {
  let strongTurns = 0;
  for (let s = 0; s <= course.length; s += 40) {
    const frame = main(s);
    for (const vector of [frame.point, frame.forward, frame.right, frame.up]) {
      assert.ok(vector.every(Number.isFinite), `invalid route at ${s}`);
    }
    for (const v of [frame.forward, frame.right, frame.up]) near(Math.hypot(...v), 1, 1e-5);
    near(dot(frame.forward, frame.right), 0, 1e-5);
    near(dot(frame.forward, frame.up), 0, 1e-5);
    near(dot(frame.right, frame.up), 0, 1e-5);
    if (s < course.length - 200) {
      assert.ok(separation(frame.point, main(s + 40).point) < 48, `road seam near ${s}`);
      if (dot(frame.forward, main(s + 200).forward) < -0.35) strongTurns++;
    }
  }
  assert.ok(strongTurns >= 2, 'course needs distinct real U-turns');
});

test('three genuine split/merge alternatives share their ground endpoints', () => {
  for (const edge of course.branches) {
    const entry = sampleMonsoonRoute(edge.id, edge.from);
    const exit = sampleMonsoonRoute(edge.id, edge.to);
    assert.ok(separation(entry.point, main(edge.from).point) < 0.1, edge.id + ' entry');
    assert.ok(separation(exit.point, main(edge.to).point) < 0.1, edge.id + ' exit');
    const mid = (edge.from + edge.to) / 2;
    assert.ok(separation(sampleMonsoonRoute(edge.id, mid).point, main(mid).point) > 15, edge.id);
    assert.ok(separation(entry.point, exit.point) > 50, edge.id + ' cannot be degenerate');
  }
  const bridge = course.branches.find(e => e.id === 'waterfall-skybridge');
  const mid = (bridge.from + bridge.to) / 2;
  assert.ok(sampleMonsoonRoute(bridge.id, mid).point[1] - main(mid).point[1] >= 15, 'bridge needs real clearance');
  for (const id of ['ground', ...course.branches.map(e => e.id)]) {
    assert.throws(() => sampleMonsoonRoute(id, -5), /distance/i);
  }
});

test('ordered checkpoints gate the finish and cannot be skipped by flying', () => {
  const gates = course.checkpoints;
  assert.ok(gates.length >= 5);
  assert.ok(gates.every((n, i) => i === 0 || n > gates[i - 1]));
  const passed = monsoonPassedCheckpoints(0, course.length);
  assert.deepEqual(passed, gates);
  assert.equal(monsoonCanFinish(course.length, passed), true);
  assert.equal(monsoonCanFinish(course.length, passed.slice(0, -1)), false);
  assert.equal(monsoonCanFinish(course.length - 1, passed), false);
  for (const edge of course.branches) {
    assert.ok(gates.some(n => n > edge.to), edge.id + ' must rejoin before checkpoint');
  }
});

test('shallow water affects contact without exceeding the safe flooding cap', () => {
  const ford = course.branches.find(e => e.id === 'river-ford');
  const water = monsoonWetContact(ford.id, (ford.from + ford.to) / 2);
  const dry = monsoonWetContact('ground', 100);
  assert.ok(water.depth > 0.04 && water.depth <= 0.3);
  assert.ok(water.wetness > dry.wetness);
  assert.ok(water.gripScale < dry.gripScale && water.gripScale >= 0.7);
  assert.deepEqual(monsoonWetContact('ground', 100), dry, 'environment deterministic');
});

test('solid ruin debris has swept collision and visible AI bypass space', () => {
  assert.ok(course.obstacles.some(obstacle => obstacle.kind === 'collapsed-column'));
  assert.ok(course.obstacles.some(obstacle => obstacle.kind === 'fallen-tree'));
  for (const obstacle of course.obstacles) {
    assert.ok(obstacle.radius > 0 && obstacle.height > 0);
    const hit = monsoonObstacleHit(obstacle.edgeId, obstacle.at - 10, obstacle.at + 10, obstacle.lateral);
    assert.equal(hit?.id, obstacle.id, `missing solid obstacle ${obstacle.id}`);
    const noHit = monsoonObstacleHit(obstacle.edgeId, obstacle.at - 10, obstacle.at + 10, obstacle.lateral + 30);
    assert.equal(noHit, null, 'other lane must not be a phantom wall');
    const steer = monsoonAvoidance(obstacle.edgeId, obstacle.at - 45, obstacle.lateral);
    assert.ok(Math.abs(steer - obstacle.lateral) > obstacle.radius + 1.5, obstacle.id + ' should be avoided');
  }
});

test('recovery selects passed safe checkpoint on the real ground and never teleports to finish', () => {
  const passed = course.checkpoints.slice(0, 3);
  const safe = monsoonRecovery(8500, passed);
  assert.equal(safe.edgeId, 'ground');
  assert.equal(safe.distance, passed.at(-1));
  assert.ok(separation(safe.point, main(safe.distance).point) < 1e-5);
  const start = monsoonRecovery(2500, []);
  assert.equal(start.distance, 0);
  assert.throws(() => sampleMonsoonRoute('nonexistent', 1000), /edge/i);
});
