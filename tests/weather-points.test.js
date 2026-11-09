import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWeatherPoints } from '../src/weather-points.ts';

test('the shared weather particle set keeps its 180-point layout and lives outside world.js', () => {
  const { positions, geometry, points } = createWeatherPoints();
  assert.equal(positions.length, 180 * 3);
  assert.equal(geometry.attributes.position.array, positions);
  assert.equal(points.geometry, geometry);
  const i = 7;
  assert.deepEqual([...positions.slice(i * 3, i * 3 + 3)].map(x => +x.toFixed(4)),
    [Math.sin(i * 29) * 45, i * 17 % 32, -(i * 13 % 180)].map(x => +x.toFixed(4)));
  assert.equal(points.material.opacity, 0.65);
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /new THREE\.Points\(weatherGeometry/);
  assert.match(world, /createWeatherPoints\(\)/);
});
