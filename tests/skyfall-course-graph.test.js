import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourseGraph } from '../src/course-graph.ts';
import { SKYFALL_GRAPH } from '../src/courses/skyfall-course-graph.ts';
import { SKYFALL_COURSE, SKYFALL_GROUND_PATH } from '../src/courses/skyfall-archipelago.ts';

test('Skyfall translates all 10 authored edges into the validated shared CourseGraph contract', () => {
  assert.equal(validateCourseGraph(SKYFALL_GRAPH), SKYFALL_GRAPH);
  assert.equal(SKYFALL_GRAPH.nodes.length, SKYFALL_COURSE.nodes.length);
  assert.equal(SKYFALL_GRAPH.edges.length, 10);
  assert.deepEqual(SKYFALL_GRAPH.groundRoute, SKYFALL_GROUND_PATH);
  assert.deepEqual([...SKYFALL_GRAPH.checkpoints, SKYFALL_GRAPH.finish], SKYFALL_COURSE.checkpoints);
  assert.equal(SKYFALL_GRAPH.nodes.find(n => n.id === 'finish')?.kind, 'finish');
});

test('Skyfall graph preserves every 3D edge endpoint, width and ground/flight route identity', () => {
  for (const source of SKYFALL_COURSE.edges) {
    const mapped = SKYFALL_GRAPH.edges.find(e => e.id === source.id);
    assert.ok(mapped, source.id);
    assert.equal(mapped.from, source.from);
    assert.equal(mapped.to, source.to);
    assert.equal(mapped.mode, source.mode === 'air' ? 'flight' : 'ground');
    assert.equal(mapped.width, source.width);
    assert.equal(mapped.points.length, source.points.length);
    for (let i = 0; i < source.points.length; i++) {
      const point = source.points[i];
      assert.deepEqual(mapped.points[i], [point.x, point.y, point.z], source.id);
    }
  }
});
