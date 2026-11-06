import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { routeLength, sampleRoute } from '../src/course-route-frame.ts';
import { STORMLINE_MEGACITY } from '../src/courses/stormline-megacity.ts';
import { STORMLINE_COURSE_GRAPH } from '../src/courses/stormline-course-graph.ts';
import {
  PLAYABLE_COURSE_GRAPH, stormlineRuntimeFrame, stormlineRuntimeLength,
  STORMLINE_CHECKPOINT_ENVELOPES, stormlineCheckpointVolumeCandidate,
  stormlineObstacleCollisionCandidates,
} from '../src/courses/stormline-megacity-runtime-adapter.ts';

const course = STORMLINE_MEGACITY;

test('uses the shared validated canonical graph and a complete, connected all-ground route', () => {
  assert.strictEqual(PLAYABLE_COURSE_GRAPH, STORMLINE_COURSE_GRAPH);
  assert.strictEqual(validateCourseGraph(PLAYABLE_COURSE_GRAPH), PLAYABLE_COURSE_GRAPH);
  assert.deepEqual(PLAYABLE_COURSE_GRAPH.groundRoute, course.mainRoute);
  const edges = new Map(PLAYABLE_COURSE_GRAPH.edges.map(edge => [edge.id, edge]));
  let at = PLAYABLE_COURSE_GRAPH.start;
  for (const id of PLAYABLE_COURSE_GRAPH.groundRoute) {
    const edge = edges.get(id);
    assert.equal(edge.from, at);
    assert.equal(edge.mode, 'ground');
    assert.notEqual(edge.surface, 'gap');
    assert.ok(routeLength(PLAYABLE_COURSE_GRAPH, id) > 0);
    at = edge.to;
  }
  assert.equal(at, PLAYABLE_COURSE_GRAPH.finish);
  assert.deepEqual(PLAYABLE_COURSE_GRAPH.checkpoints, course.checkpoints.slice(0, -1).map(c => c.node));
});

test('every authored fork reconnects at the same mandatory checkpoint path', () => {
  const edges = new Map(PLAYABLE_COURSE_GRAPH.edges.map(edge => [edge.id, edge]));
  for (const fork of course.forks) {
    const safe = edges.get(fork.safe), risky = edges.get(fork.risky);
    assert.equal(safe.from, fork.from);
    assert.equal(risky.from, fork.from);
    assert.equal(safe.to, fork.to);
    assert.equal(risky.to, fork.to);
    assert.equal(safe.mode, 'ground');
  }
  assert.equal(edges.get('roof-flight').mode, 'flight');
  assert.equal(edges.get('skyway-cut').layer, 'viaduct');
  assert.equal(edges.get('tunnel-cut').layer, 'tunnel');
});

test('3D road frames and distance match the one shared deterministic sampler', () => {
  for (const edge of PLAYABLE_COURSE_GRAPH.edges) {
    assert.equal(stormlineRuntimeLength(edge.id), routeLength(PLAYABLE_COURSE_GRAPH, edge.id));
    const length = stormlineRuntimeLength(edge.id);
    for (const ratio of [0, .125, .5, .875, 1]) {
      const s = length * ratio;
      const frame = stormlineRuntimeFrame(edge.id, s);
      assert.deepEqual(frame, sampleRoute(PLAYABLE_COURSE_GRAPH, edge.id, s));
      assert.deepEqual(frame, stormlineRuntimeFrame(edge.id, s));
      for (const axis of [frame.forward, frame.right, frame.up]) {
        assert.ok(axis.every(Number.isFinite));
        assert.ok(Math.abs(Math.hypot(...axis) - 1) < 1e-6);
      }
    }
  }
});

test('all signed checkpoint height envelopes, including finish, remain unchanged', () => {
  assert.deepEqual(STORMLINE_CHECKPOINT_ENVELOPES, course.checkpoints);
  for (const gate of course.checkpoints) {
    const approaching = course.edges.find(edge => edge.to === gate.node);
    assert.ok(approaching);
    assert.equal(stormlineCheckpointVolumeCandidate(gate.node, approaching.id, course.nodes[gate.node]), true);
    const [x, , z] = course.nodes[gate.node];
    assert.equal(stormlineCheckpointVolumeCandidate(gate.node, approaching.id, [x, gate.maxY + 1, z]), false);
    assert.equal(stormlineCheckpointVolumeCandidate(gate.node, approaching.id, [x, gate.minY - 1, z]), false);
    assert.equal(stormlineCheckpointVolumeCandidate(gate.node, approaching.id, [x + gate.radius + 1, 0, z]), false);
    assert.equal(stormlineCheckpointVolumeCandidate(gate.node, 'not-an-edge', course.nodes[gate.node]), false);
  }
  assert.equal(stormlineCheckpointVolumeCandidate('j', 'roof-flight', course.nodes.j), true);
  assert.equal(stormlineCheckpointVolumeCandidate('j', 'ground-detour', course.nodes.j), true);
  assert.equal(stormlineCheckpointVolumeCandidate('j', 'neon-avenue', course.nodes.j), false);
});

test('collision candidates are confined to the active road edge and its 3D layer', () => {
  for (const obstacle of course.obstacles) {
    const frame = stormlineRuntimeFrame(obstacle.edge, obstacle.s);
    const position = [
      frame.point[0] + frame.right[0] * obstacle.lateral + frame.up[0] * obstacle.height / 2,
      frame.point[1] + frame.right[1] * obstacle.lateral + frame.up[1] * obstacle.height / 2,
      frame.point[2] + frame.right[2] * obstacle.lateral + frame.up[2] * obstacle.height / 2,
    ];
    const candidates = stormlineObstacleCollisionCandidates(obstacle.edge, position);
    assert.equal(candidates.some(item => item.id === obstacle.id), obstacle.solid);
    const different = course.edges.find(edge => edge.id !== obstacle.edge && edge.layer !== course.edges.find(e => e.id === obstacle.edge).layer);
    assert.ok(!stormlineObstacleCollisionCandidates(different.id, position).some(item => item.id === obstacle.id));
    assert.ok(!stormlineObstacleCollisionCandidates(obstacle.edge, [position[0], position[1] + 100, position[2]]).some(item => item.id === obstacle.id));
  }
  assert.deepEqual(stormlineObstacleCollisionCandidates('unknown', [0, 0, 0]), []);
  assert.deepEqual(stormlineObstacleCollisionCandidates('night-start', [Infinity, 0, 0]), []);
});
