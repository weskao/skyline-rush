import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { captureRaceMotion, interpolateMotion, smoothDriftYaw } from '../src/vehicle-render-motion.js';

const car = (distance = 0, x = 0, altitude = 0) => ({ distance, x, altitude, speed: 60, steering: 0, verticalSpeed: 0 });

test('captures previous simulation step for player, rivals and traffic without allocating new snapshots each tick', () => {
  const race = { player: car(10, 2), rivals: [car(8, -2)], traffic: [car(20, 7)] };
  const snapshots = captureRaceMotion(race);
  assert.equal(snapshots.player.distance, 10);
  assert.equal(snapshots.rivals[0].x, -2);
  assert.equal(snapshots.traffic[0].distance, 20);
  const firstPlayer = snapshots.player, firstRival = snapshots.rivals[0];
  race.player.distance = 12; race.rivals[0].x = -1;
  assert.equal(captureRaceMotion(race, snapshots), snapshots);
  assert.equal(snapshots.player, firstPlayer);
  assert.equal(snapshots.rivals[0], firstRival);
  assert.equal(snapshots.player.distance, 12);
  assert.equal(snapshots.rivals[0].x, -1);
});

test('render interpolation fills the 60Hz simulation gap without changing physical state', () => {
  const physics = car(11, 4, 0);
  Object.assign(physics, { speed: 118, steering: 1 });
  const previous = { distance: 10, x: 3, altitude: 0, speed: 90, steering: 0, verticalSpeed: 0 };
  const output = {};
  assert.equal(interpolateMotion(physics, previous, 0.5, output), output);
  assert.deepEqual(output, { distance: 10.5, x: 3.5, altitude: 0, speed: 104, steering: 0.5, verticalSpeed: 0 });
  assert.equal(physics.x, 4, 'rendering must not change collision or drift physics');
  assert.equal(interpolateMotion(physics, previous, -1, output).distance, 10);
  assert.equal(interpolateMotion(physics, previous, 2, output).distance, 11);
});

test('takeoff, powered flight, nitro and landing stay continuous in both steering directions', () => {
  const previous = car(100, -3, 2);
  Object.assign(previous, { speed: 90, steering: -1, verticalSpeed: -8 });
  const current = car(102, -2.7, 0);
  Object.assign(current, { speed: 118, steering: 1, verticalSpeed: 0, nitroTime: 2, drift: null });
  const mid = interpolateMotion(current, previous, 0.5, {});
  assert.ok(Math.abs(mid.x + 2.85) < 1e-10);
  assert.equal(mid.altitude, 1);
  assert.equal(mid.speed, 104);
  assert.equal(mid.verticalSpeed, -4);
  assert.equal(mid.steering, 0);
  assert.equal(current.altitude, 0);
  assert.equal(interpolateMotion(current, previous, 1, {}).altitude, 0);
});

test('120Hz drawing produces uniform in-between motion rather than repeated 60Hz positions', () => {
  const race = { player: car(), rivals: [], traffic: [] };
  const previous = captureRaceMotion(race);
  let accumulator = 0;
  const positions = [];
  for (let frame = 0; frame < 120; frame++) {
    accumulator += 1 / 120;
    if (accumulator + 1e-9 >= 1 / 60) {
      captureRaceMotion(race, previous);
      race.player.x += 0.12;
      accumulator -= 1 / 60;
    }
    positions.push(interpolateMotion(race.player, previous.player, accumulator / (1 / 60), {}).x);
  }
  for (let i = 5; i < positions.length; i++)
    assert.ok(Math.abs((positions[i] - positions[i - 1]) - 0.06) < 1e-8, `frame ${i}: ${positions[i - 1]} -> ${positions[i]}`);
});

test('drift yaw eases into and out of a slide instead of snapping 25 degrees on brake or touchdown', () => {
  const dir = { dir: 1 };
  const first = smoothDriftYaw(0, dir, 1 / 60);
  assert.ok(first < 0 && first > -0.1, `first drift frame jumped to ${first}`);
  let angle = first;
  for (let i = 0; i < 30; i++) angle = smoothDriftYaw(angle, dir, 1 / 60);
  assert.ok(angle < -0.42 && angle > -0.44);
  const release = smoothDriftYaw(angle, null, 1 / 60);
  assert.ok(release > angle && release < 0);
  assert.equal(smoothDriftYaw(release, null, 0), release, 'paused rendering cannot animate drift');
});

test('car presentation reuses one mesh-owned render buffer and preserves exact simulation flags', async () => {
  const { poseFor } = await import('../src/vehicle-render-motion.js');
  const mesh = { userData: {} };
  const physics = { ...car(10, 4), nitroTime: 1, drift: { dir: 1 } };
  const previous = { ...car(9, 3) };
  const rendered = poseFor(mesh, physics, previous, 0.5);
  assert.equal(rendered.x, 3.5);
  assert.equal(poseFor(mesh, physics, previous, 0.75), rendered);
  assert.equal(physics.x, 4);
  assert.equal(physics.nitroTime, 1);
  assert.equal(poseFor(mesh, physics, previous, 1), physics);
});

// NITRO/BOOST ignition squat: presentation only. Pitching a car about its origin would sink the rear tyres into the road;
// the lift pivots it on the rear tyres' contact instead, read from each car's own wheels.
test('ignition squat lifts the nose 1-2 degrees on the rear tyres of every car, never sinking them into the road', async () => {
  const { squatPitch, rearAxleLift } = await import('../src/vehicle-render-motion.js');
  const { makeCar, CAR_STYLES } = await import('../src/car-model.js');
  const { orientCarOnRoad } = await import('../src/vehicle-pose.ts');
  const { Vector3 } = await import('three');
  const deg = radians => radians * 180 / Math.PI;
  assert.ok(deg(squatPitch(1)) >= 1 && deg(squatPitch(1)) <= 2, `${deg(squatPitch(1)).toFixed(2)} deg at full squat`);
  assert.equal(squatPitch(0), 0);
  assert.equal(squatPitch(3), squatPitch(1), 'capped');
  assert.equal(squatPitch(NaN), 0);
  const road = { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] };
  const wheelY = (mesh, rear) => mesh.userData.wheels.filter(w => (w.position.z > 0) === rear).map(w => w.getWorldPosition(new Vector3()).y);
  for (const [name, style] of Object.entries(CAR_STYLES)) {
    const car = makeCar(style), pitch = squatPitch(1);
    orientCarOnRoad(car, road); car.updateMatrixWorld(true);
    const rearRest = wheelY(car, true), frontRest = wheelY(car, false);
    orientCarOnRoad(car, road, 0, pitch).translateY(rearAxleLift(car, pitch)); car.updateMatrixWorld(true);
    wheelY(car, true).forEach((y, i) => assert.ok(Math.abs(y - rearRest[i]) < 0.002, `${name}: rear tyre moved ${(y - rearRest[i]).toFixed(4)} m`));
    wheelY(car, false).forEach((y, i) => assert.ok(y - frontRest[i] > 0.03 && y - frontRest[i] < 0.1, `${name}: nose lifts ${(y - frontRest[i]).toFixed(3)} m`));
    assert.equal(rearAxleLift(car, 0), 0);
  }
});

test('world.js poses the player with the ignition squat', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(world, /squatPitch\(sprintVisual\.frame\.squat\)/, 'the squat share comes from the sprint frame');
  assert.match(world, /squatLift = rearAxleLift\(mesh, squat\)/);
  assert.match(world, /orientCarOnRoad\([^;]*\+ squat[^;]*\)\.translateY\(squatLift\)/, 'pitched on the rear tyres');
  assert.match(world, /mesh\.userData\.altitude \+= squatLift/, 'the ground shadow stays on the road under the lifted car');
});
