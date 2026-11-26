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

test('rain is centred on the rendered car, not on its road-frame lateral offset', async () => {
  const { centerWeatherOn } = await import('../src/weather-points.ts');
  const { skyPosition } = await import('../src/sky-track.ts');
  const { Object3D } = await import('three');
  // CI 45844232055: on Spiral the road has already turned 20 m in, so a car 2.5 m right of centre sits off world z=0;
  // rain placed at (lane x, altitude + 25, 15) drifted 0.0006 m from the car the player sees.
  const car = new Object3D(); car.position.fromArray(skyPosition(60, 2.5, 1.2, 60));
  assert.ok(Math.abs(car.position.z) > 1e-3, 'the banked-road fixture must sit off world z=0');
  const { points } = createWeatherPoints();
  centerWeatherOn(points, car);
  assert.deepEqual(points.position.clone().sub(car.position).toArray().map(v => +v.toFixed(9)), [0, 25, 15]);
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /weather\.position\.set\(visualCar/, 'no second, road-frame derivation of the car pose');
  const placed = world.indexOf('centerWeatherOn(weather, player)');
  assert.ok(placed > world.indexOf('updateCar(player, car, distance'), 'rain follows the pose drawn this frame, not last frame');
  assert.ok(placed > world.indexOf('player.position.z -= finishTravel'), 'and after the finish run-on moves the car');
});
