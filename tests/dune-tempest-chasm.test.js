import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDuneChasmTerrain } from '../src/courses/dune-tempest-chasm.ts';

const sample = (_, s) => ({point: [s / 2, 10 + 70 * Math.sin(Math.PI * s / 1000), -s], right: [1, 0, 0]});
const vertex = (mesh, row, column) =>
  mesh.positions.slice((row * 7 + column) * 3, (row * 7 + column + 1) * 3);

test('aerial chasm has true floor and rising canyon walls without an invisible bridge', () => {
  const g = buildDuneChasmTerrain(sample, 'air', 200, 800, 1000, 24, 10, 20);
  assert.equal(g.positions.length, 31 * 7 * 3);
  assert.equal(g.indices.length, 30 * 6 * 6);
  const floor = vertex(g, 15, 3), left = vertex(g, 15, 0), right = vertex(g, 15, 6);
  assert.ok(floor[1] < sample('air', 500).point[1] - 35, 'floor must lie below flight trajectory');
  assert.ok(left[1] > floor[1] + 20 && right[1] > floor[1] + 20, 'walls frame the air gap');
  assert.ok(left[0] < floor[0] && right[0] > floor[0], 'chasm spans both sides of flight');
  assert.ok(g.positions.every(Number.isFinite));
});

test('adjacent streamed chasm sections have identical boundary vertices', () => {
  const a = buildDuneChasmTerrain(sample, 'air', 200, 500, 1000, 24, 10, 20);
  const b = buildDuneChasmTerrain(sample, 'air', 500, 800, 1000, 24, 10, 20);
  for (let col = 0; col < 7; col++) assert.deepEqual(vertex(a, 15, col), vertex(b, 0, col));
});

test('invalid ranges and non-finite frames cannot enter WebGL geometry buffers', () => {
  assert.throws(() => buildDuneChasmTerrain(sample, 'air', 500, 400, 1000, 24, 10), /range|bounds/i);
  assert.throws(() => buildDuneChasmTerrain(sample, 'air', 100, 1200, 1000, 24, 10), /range|bounds/i);
  assert.throws(() => buildDuneChasmTerrain(() => ({point: [NaN, 0, 0], right: [1, 0, 0]}),
    'air', 100, 200, 1000, 24, 10), /finite|frame/i);
});
