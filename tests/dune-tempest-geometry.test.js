import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDuneRoadChunk, duneSurfaceIntervals, positionDuneHazards, duneWeatherBudget } from '../src/courses/dune-tempest-geometry.ts';

const sample = (edgeId, s) => ({ edgeId, localS: s, point: [s * .5, 10 + s * .1, -s],
  right: [1,0,0], up: [0,1,0], forward: [0,0,-1], width: 28 });
const at = (positions, row, column) => positions.slice((row * 4 + column) * 3, (row * 4 + column) * 3 + 3);

test('streamed edge chunks join seamlessly at exact 3D endpoints', () => {
  const a = buildDuneRoadChunk(sample, 'bend', 0, 60, 28, 10);
  const b = buildDuneRoadChunk(sample, 'bend', 60, 120, 28, 10);
  assert.equal(a.positions.length, 7 * 4 * 3);
  assert.equal(a.roadIndices.length, 6 * 6);
  assert.equal(a.shoulderIndices.length, 6 * 12);
  for (let lane = 0; lane < 4; lane++) assert.deepEqual(at(a.positions, 6, lane), at(b.positions, 0, lane));
  assert.deepEqual(at(a.positions, 0, 1), [-14, 10.035, 0]);
  assert.deepEqual(at(a.positions, 0, 2), [14, 10.035, 0]);
});
test('ribbon follows shared 3D road height, curvature and wide shoulders', () => {
  const r = buildDuneRoadChunk(sample, 'bend', 40, 80, 28, 10);
  const a = at(r.positions, 0, 1), b = at(r.positions, 4, 1);
  assert.ok(a[1] > 13 && b[1] > a[1]);
  assert.ok(b[0] > a[0]);
  assert.equal(Math.round(at(r.positions, 0, 0)[0]), 0);
  assert.ok(at(r.positions, 0, 0)[1] < a[1]);
  assert.ok(at(r.positions, 0, 3)[0] > at(r.positions, 0, 2)[0]);
});
test('obstacle footprints sample authoritative edge arc length and local lateral frame', () => {
  const hazards = [{ id: 'rock', edgeId: 'bend', atFraction: .25, lateralMeters: 6,
    collisionRadiusMeters: 4, visualRadiusMeters: 5.5, kind: 'rock', aiPreviewMeters: 120 }];
  const placed = positionDuneHazards(hazards, 'bend', 200, sample);
  assert.equal(placed.length, 1);
  assert.equal(placed[0].atS, 50);
  assert.deepEqual(placed[0].position, [31, 15, -50]);
  assert.equal(placed[0].collisionRadiusMeters, 4);
  assert.equal(positionDuneHazards(hazards, 'other', 200, sample).length, 0);
});
test('visual obstacle mesh cannot be smaller than collision footprint', () => {
  const hazards = [{ id:'rock', edgeId:'bend', atFraction:.5, lateralMeters:0,
    collisionRadiusMeters:8, visualRadiusMeters:3, kind:'rock', aiPreviewMeters:120 }];
  assert.throws(() => positionDuneHazards(hazards, 'bend', 200, sample), /footprint|radius/i);
});
test('weather is capped by quality and respects Reduced Motion', () => {
  const zone = { particleBudgets: { low:24, medium:80, high:160, reducedMotion:0 } };
  assert.deepEqual(['low','medium','high'].map(q => duneWeatherBudget(zone, q, false)), [24,80,160]);
  for (const quality of ['low','medium','high']) assert.equal(duneWeatherBudget(zone, quality, true), 0);
});

test('aerial gap has only real takeoff and landing pads, never a continuous floating road', () => {
  assert.deepEqual(duneSurfaceIntervals(0, 180, 1000, 60, 105), [[0,60]]);
  assert.deepEqual(duneSurfaceIntervals(180, 800, 1000, 60, 105), []);
  assert.deepEqual(duneSurfaceIntervals(800, 1000, 1000, 60, 105), [[895,1000]]);
  assert.deepEqual(duneSurfaceIntervals(850, 950, 1000, 60, 105), [[895,950]]);
});
