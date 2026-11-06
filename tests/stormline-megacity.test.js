import test from 'node:test';
import assert from 'node:assert/strict';
import { STORMLINE_MEGACITY, groundRoute, edgeLength, validateStormlineCourse, weatherBudget } from '../src/courses/stormline-megacity.ts';
const course = STORMLINE_MEGACITY;
const byId = new Map(course.edges.map(edge => [edge.id, edge]));

test('one-way 14 km road survives every optional fork and finishes once', () => {
  assert.equal(course.start, 'start');
  assert.notEqual(course.nodes[course.start].join(','), course.nodes[course.finish].join(','));
  assert.equal(course.finish, 'finish');
  assert.equal(course.forks.length, 3);
  const route = groundRoute(course);
  assert.equal(route[0].from, course.start);
  assert.equal(route.at(-1).to, course.finish);
  for (let i = 1; i < route.length; i++) assert.equal(route[i - 1].to, route[i].from);
  assert.ok(route.every(edge => edge.mode === 'drive' && edge.surface !== 'gap'));
  const length = route.reduce((sum, edge) => sum + edgeLength(edge), 0);
  assert.ok(length >= 13_500 && length <= 14_800, `mainline length ${length.toFixed(1)} m`);
  assert.deepEqual(validateStormlineCourse(course), []);
});

test('three alternatives share checkpoint nodes and have safe ground fallbacks', () => {
  for (const fork of course.forks) {
    const standard = byId.get(fork.safe), alternate = byId.get(fork.risky);
    assert.ok(standard && alternate);
    assert.equal(standard.from, alternate.from);
    assert.equal(standard.to, alternate.to);
    assert.equal(standard.mode, 'drive');
    assert.ok(alternate.risk > standard.risk);
    assert.ok(alternate.rewardSeconds > 0);
  }
  assert.deepEqual(course.checkpoints.map(x => x.node), ['a', 'c', 'f', 'h', 'j', 'finish']);
  assert.ok(course.edges.filter(x => x.mode === 'flight').length >= 1);
  assert.ok(course.edges.filter(x => x.surface === 'tunnel').length >= 1);
});

test('two hairpin features reverse tangent, remain broad and are separate from upper roads', () => {
  for (const id of ['hairpin-west', 'hairpin-east']) {
    const edge = byId.get(id);
    assert.ok(edge.width >= 22);
    const [a, b] = edge.points;
    const [beforeLast, last] = edge.points.slice(-2);
    const entering = [b[0] - a[0], b[2] - a[2]];
    const leaving = [last[0] - beforeLast[0], last[2] - beforeLast[2]];
    const dot = (entering[0] * leaving[0] + entering[1] * leaving[1]) / (Math.hypot(...entering) * Math.hypot(...leaving));
    assert.ok(dot < -0.75, `${id} should reverse road heading, got ${dot}`);
  }
  assert.ok(byId.get('skyway-cut').points.some(p => p[1] >= 22));
  assert.ok(byId.get('tunnel-cut').points.some(p => p[1] <= -6));
  assert.ok(byId.get('roof-flight').points.some(p => p[1] >= 34));
});

test('solid roadside blockers and traffic are visible on Low and avoid the center through-lane', () => {
  for (const obstacle of course.obstacles) {
    assert.ok(byId.has(obstacle.edge));
    assert.ok(obstacle.s >= 0 && obstacle.s < edgeLength(byId.get(obstacle.edge)));
    assert.ok(obstacle.lateral > 5 || obstacle.lateral < -5, `${obstacle.id} blocks center line`);
    assert.ok(obstacle.radius > 0);
    assert.equal(obstacle.solid, obstacle.kind !== 'puddle');
  }
  assert.deepEqual(Object.keys(course.qualityBudgets), ['low', 'medium', 'high']);
  assert.ok(weatherBudget(course, 'high', true).rain === 0);
  assert.ok(weatherBudget(course, 'low', false).rain < weatherBudget(course, 'high', false).rain);
});
