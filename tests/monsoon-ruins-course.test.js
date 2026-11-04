import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MONSOON_RUINS_COURSE as course,
  sampleMonsoonRoute,
  sampleMonsoonEdge,
  monsoonEdgeLength,
  monsoonGraphEdgeLength,
  sampleMonsoonGraphEdge,
  monsoonWetContact,
  monsoonTerrainHeight,
  monsoonObstacleHit,
  monsoonAvoidance,
  monsoonPassedCheckpoints,
  monsoonCrossedCheckpoint,
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
  const strongTurns = [];
  for (let s = 0; s <= course.length; s += 40) {
    const frame = main(s);
    for (const vector of [frame.point, frame.forward, frame.right, frame.up]) {
      assert.ok(vector.every(Number.isFinite), `invalid route at ${s}`);
    }
    for (const v of [frame.forward, frame.right, frame.up]) near(Math.hypot(...v), 1, 1e-5);
    near(dot(frame.forward, frame.right), 0, 1e-5);
    near(dot(frame.forward, frame.up), 0, 1e-5);
    near(dot(frame.right, frame.up), 0, 1e-5);
    if (s < course.length - 280) {
      assert.ok(separation(frame.point, main(s + 40).point) < 48, `road seam near ${s}`);
      if (dot(frame.forward, main(s + 280).forward) < -0.35) strongTurns.push(s);
    }
  }
  assert.ok(strongTurns.some(a => strongTurns.some(b => b - a > 2000)), 'two separate U-turns are required');
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
  assert.equal(monsoonCanFinish(course.length, [passed[1], passed[0], ...passed.slice(2)]), false);
  assert.equal(monsoonCanFinish(course.length, [...passed, passed[0]]), false);
  assert.equal(monsoonCanFinish(course.length - 1, passed), false);
  for (const edge of course.branches) {
    assert.ok(gates.some(n => n > edge.to), edge.id + ' must rejoin before checkpoint');
  }
});


test('each edge has a physical arc-length coordinate distinct from course progress', () => {
  for (const edgeId of ['ground', ...course.branches.map(edge => edge.id)]) {
    const length = monsoonEdgeLength(edgeId);
    const branch = course.branches.find(edge => edge.id === edgeId);
    const first = sampleMonsoonEdge(edgeId, 0);
    const last = sampleMonsoonEdge(edgeId, length);
    assert.ok(length > 100 && Number.isFinite(length));
    const from = branch?.from ?? 0;
    const to = branch?.to ?? course.length;
    assert.ok(separation(first.point, sampleMonsoonRoute(edgeId, from).point) < 0.1);
    assert.ok(separation(last.point, sampleMonsoonRoute(edgeId, to).point) < 0.1);
    for (let s = 0; s < length - 30; s += 30) {
      const next = sampleMonsoonEdge(edgeId, s + 20);
      const current = sampleMonsoonEdge(edgeId, s);
      const displacement = separation(next.point, current.point);
      assert.ok(displacement > 14 && displacement <= 20.5,
        edgeId + ' needs physical metres, not a fake distance axis');
    }
  }
});


test('checkpoint requires an actual forward world-space gate crossing on the ground', () => {
  const gate = course.checkpoints[2];
  const before = main(gate - 6);
  const after = main(gate + 6);
  assert.equal(monsoonCrossedCheckpoint(gate, before.point, after.point, 'ground'), true);
  assert.equal(monsoonCrossedCheckpoint(gate, after.point, before.point, 'ground'), false);
  assert.equal(monsoonCrossedCheckpoint(gate, before.point, after.point, 'waterfall-skybridge'), false);
  const farOutside = (p, offset, altitude = 0) =>
    p.point.map((v, i) => v + p.right[i] * offset + p.up[i] * altitude);
  assert.equal(monsoonCrossedCheckpoint(gate,
    farOutside(before, 32), farOutside(after, 32), 'ground'), false);
  assert.equal(monsoonCrossedCheckpoint(gate,
    farOutside(before, 0, 22), farOutside(after, 0, 22), 'ground'), false);
  assert.equal(monsoonCrossedCheckpoint(gate,
    main(gate - 200).point, main(gate + 200).point, 'ground'), false, 'no teleport across a gate');
});


test('shared CourseGraph can sample each authored main segment and fork by graph edge ID', () => {
  const authored = [...course.mainEdges, ...course.branches];
  assert.equal(course.mainEdges.length, course.nodes.length - 1);
  for (const edge of authored) {
    const total = monsoonGraphEdgeLength(edge.id);
    assert.ok(total > 50, edge.id);
    const start = sampleMonsoonGraphEdge(edge.id, 0);
    const end = sampleMonsoonGraphEdge(edge.id, total);
    assert.equal(start.graphEdgeId, edge.id);
    assert.equal(end.graphEdgeId, edge.id);
    near(start.distance, edge.from, 1e-5);
    near(end.distance, edge.to, 1e-5);
    assert.ok(separation(start.point, main(edge.from).point) < 0.1);
    assert.ok(separation(end.point, main(edge.to).point) < 0.1);
    assert.throws(() => sampleMonsoonGraphEdge(edge.id, -1), /distance/i);
  }
  for (let i = 1; i < course.mainEdges.length; i++) {
    const previous = course.mainEdges[i - 1], next = course.mainEdges[i];
    assert.ok(separation(
      sampleMonsoonGraphEdge(previous.id, monsoonGraphEdgeLength(previous.id)).point,
      sampleMonsoonGraphEdge(next.id, 0).point,
    ) < 0.01, 'main segment joins must be watertight');
  }
  assert.throws(() => sampleMonsoonGraphEdge('ground-nope', 100), /edge/i);
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

test('valley edges and puddles enter without terrain steps or instantaneous tyre-grip changes', () => {
  for (const at of [2900, 4900]) {
    const before = monsoonTerrainHeight(at - 1, 110);
    const after = monsoonTerrainHeight(at + 1, 110);
    assert.ok(Math.abs(after - before) < 1.5,
      `rainforest valley must not have a vertical cliff at ${at}`);
  }
  for (const at of [2100, 2480, 5450, 5640, 11000, 11200]) {
    const before = monsoonWetContact('ground', at - 1);
    const after = monsoonWetContact('ground', at + 1);
    assert.ok(Math.abs(after.depth - before.depth) < .015,
      `water contact must be continuous at ${at}`);
    assert.ok(Math.abs(after.gripScale - before.gripScale) < .02,
      `wet grip cannot jump at ${at}`);
  }
});

test('solid ruin debris has swept collision and visible AI bypass space', () => {
  assert.ok(course.obstacles.some(obstacle => obstacle.kind === 'collapsed-column'));
  assert.ok(course.obstacles.some(obstacle => obstacle.kind === 'fallen-tree'));
  assert.equal(monsoonObstacleHit('ground', 3210, 3230, 6), null, 'a river-only rock must not collide across disconnected edges');
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


test('swept lateral obstacle query catches diagonal crosses but not adjacent routes', () => {
  const column = course.obstacles.find(o => o.id === 'collapsed-column-1');
  assert.ok(column);
  const hit = monsoonObstacleHit('ground', column.at - 10, column.at + 10, 8, 0, -20);
  assert.equal(hit?.id, column.id, 'diagonal crossing hits column even when final lane is clear');
  assert.equal(monsoonObstacleHit('waterfall-skybridge', column.at - 10,
    column.at + 10, 8, 0, -20), null, 'separate edge never collides');
});

test('diagonal obstacle sweep detects a side-swipe before its centre', () => {
  const column = course.obstacles.find(o => o.id === 'collapsed-column-1');
  assert.ok(column);
  assert.equal(monsoonObstacleHit('ground', column.at - 3, column.at + 25,
    column.lateral + 50, 0, column.lateral - .5)?.id, column.id);
  assert.equal(monsoonObstacleHit('ground', column.at - 3, column.at + 25,
    column.lateral + 50, 0, column.lateral + 12), null);
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
