// Task 8c: the cloud sea under the Sky Spiral course and the wisps over its road (src/spiral-clouds.ts). The deck
// may never reach the road that is drawn, on the lap, on the run-out past the finish or in Endless; it may not move
// while the car is parked; and both meshes must be in the scene, hidden, from creation (the shader warmup).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, Scene } from 'three';
import { createSkyScene } from '../src/sky-scene.js';
import { createSpiralClouds, cloudSeaLevel, CLOUD_SEA, CLOUD_WISPS } from '../src/spiral-clouds.ts';
import { SKY_LENGTH, skyPoint } from '../src/sky-track.ts';

function rig() {
  const scene = new Scene(), course = createSkyScene(scene), clock = { value: 0 };
  const clouds = createSpiralClouds({ ...course.parts, dome: new Mesh(), clock });
  const sea = scene.getObjectByName('Sky Spiral cloud sea'), wisps = scene.getObjectByName('Sky Spiral cloud wisps');
  return { course, clouds, sea, wisps, clock };
}
/** The lowest road the ribbon draws with the car at `distance` (sky-scene.js: 140 m behind to 1,660 m ahead). */
function lowestDrawn(distance, endless) {
  let low = Infinity;
  for (let s = Math.max(0, distance - 140); s <= distance + 1660; s += 10) low = Math.min(low, skyPoint(s, endless || s > SKY_LENGTH).y);
  return low;
}

test('the cloud sea and the wisps join the course hidden, as shader meshes for the warmup', () => {
  const { course, sea, wisps, clouds, clock } = rig();
  assert.equal(sea.parent, course.parts.group, 'the deck stays under the camera');
  assert.equal(wisps.parent, course.parts.road, 'the wisps stand in track space');
  for (const mesh of [sea, wisps]) { assert.equal(mesh.visible, false); assert.ok(mesh.material.isShaderMaterial); }
  assert.equal(sea.material.uniforms.time, clock, 'the shared clock: Reduced Motion stops the drift');
  assert.equal(wisps.material.uniforms.time, clock);
  clouds.show(true);
  assert.deepEqual([sea.visible, wisps.visible, sea.material.uniforms.steps.value], [true, true, CLOUD_SEA.high[0]]);
  clouds.show(true, true);
  assert.deepEqual([sea.material.uniforms.steps.value, sea.material.uniforms.taps.value], [...CLOUD_SEA.ultra]);
  assert.ok(CLOUD_SEA.ultra[0] <= 24 && CLOUD_SEA.ultra[1] <= 6, 'inside the shader\'s loop bounds');
  clouds.show(false);
  assert.deepEqual([sea.visible, wisps.visible], [false, false]);
  clouds.dispose();
  assert.deepEqual([sea.parent, wisps.parent], [null, null]);
});

test('the deck belongs under every road the ribbon draws: the lap, the run-out and Endless', () => {
  for (const endless of [false, true]) for (let distance = 0; distance <= (endless ? 3 : 1) * SKY_LENGTH; distance += 250) {
    const gap = lowestDrawn(distance, endless) - cloudSeaLevel(distance, endless);
    assert.ok(gap >= CLOUD_SEA.clear - 3, `${distance} m${endless ? ' endless' : ''}: the deck is ${gap.toFixed(1)} m under the road`);
  }
});

test('driving, the deck eases and stays under the drawn road; parked, it does not move', () => {
  for (const endless of [false, true]) {
    const { course, clouds, sea } = rig();
    clouds.show(true);
    let previous = NaN;
    for (let distance = 0; distance <= (endless ? 2 : 1) * SKY_LENGTH; distance += 5) {
      course.update(distance, 'high', endless);
      clouds.stream(distance, endless);
      assert.ok(lowestDrawn(distance, endless) - clouds.level >= 8, `${distance} m: ${(lowestDrawn(distance, endless) - clouds.level).toFixed(1)} m of air`);
      assert.ok(!(Math.abs(clouds.level - previous) > 5 * CLOUD_SEA.sink + 1e-9), `${distance} m: no jump`);
      assert.ok(Math.abs(sea.position.y - (clouds.level - skyPoint(distance, endless).y)) < 1e-6, 'drawn camera-relative');
      previous = clouds.level;
    }
    const parked = clouds.level;
    for (let frame = 0; frame < 30; frame++) clouds.stream(endless ? 2 * SKY_LENGTH : SKY_LENGTH, endless);
    assert.equal(clouds.level, parked, 'parked at the finish');
    clouds.stream(0, endless);
    assert.equal(clouds.level, cloudSeaLevel(0, endless), 'a restart starts at the level');
    const { x, y } = sea.material.uniforms.offset.value;
    assert.ok(x >= 0 && x < CLOUD_SEA.tile && y >= 0 && y < CLOUD_SEA.tile, 'the noise offset wraps at its tile');
  }
});

test('wisps stand over the road centreline ahead of the car, a few at a time', () => {
  const { course, clouds, wisps } = rig(), anchor = wisps.geometry.getAttribute('anchor'), drift = wisps.geometry.getAttribute('drift');
  let most = 0, none = 0;
  for (let distance = 0; distance <= SKY_LENGTH; distance += 200) {
    course.update(distance, 'high');
    clouds.stream(distance, false);
    const count = wisps.geometry.instanceCount;
    most = Math.max(most, count); if (!count) none++;
    for (let i = 0; i < count; i++) {
      const size = drift.getW(i), right = Math.hypot(drift.getX(i), drift.getY(i));
      assert.ok(size >= 60 && size <= 120 && right > .9 && right <= 1.0001);
      let nearest = Infinity;
      for (let s = Math.max(0, Math.floor(distance / CLOUD_WISPS.every) - 1) * CLOUD_WISPS.every; s <= distance + CLOUD_WISPS.reach; s += CLOUD_WISPS.every) {
        const p = skyPoint(s, s > SKY_LENGTH);
        nearest = Math.min(nearest, Math.hypot(p.x - anchor.getX(i), p.y - anchor.getY(i), p.z - anchor.getZ(i)));
      }
      assert.ok(nearest < 1e-3, `${distance} m: wisp ${i} is anchored on the road`);
    }
  }
  assert.ok(most >= 3 && most <= CLOUD_WISPS.capacity, `at most ${most} at once`);
  assert.ok(none < 5, 'clouds cross the road on most of the lap');
});
