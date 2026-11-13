import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as rig from '../src/race-camera.ts';
import { RACE_CAMERA, raceCameraView, rigBack, rigHeight, rigFov, rigShake, stepCameraSwing } from '../src/race-camera.ts';
import { CAR_HEIGHT, ROAD_LIMIT } from '../src/game.js';
import { MAX_SPEED, NITRO_CAP_BONUS } from '../src/drive-rules.ts';

const deg = radians => radians * 180 / Math.PI;
const CAR_HALF_LENGTH = 2.4, CAR_WIDTH = 2; // src/aero-vfx.js rear ports sit at z 2.39; wheels span about 2 m
const DRIFT_YAW = 25 * Math.PI / 180; // src/vehicle-render-motion.js smoothDriftYaw
// Measured on the rendered player mesh (Roadster and Crimson GT): the windscreen starts 1.32 m ahead of the car origin,
// the bonnet in front of it falls from 0.81 m to a 0.66 m nose that ends 2.48 m ahead.
const WINDSCREEN_BASE = 1.32, NOSE_TOP = 0.66, NOSE_TIP = 2.48;
const PHONE_PORTRAIT = 390 / 844;
// The rig this replaces (src/world.js before the retune): a high, distant chase and a roof-height first person.
const OLD = { landscape: { back: 12.5, height: 5 }, portrait: { back: 14.5, height: 5 }, firstHeight: 1.7, fov: 57 };

const chase = raceCameraView(0, false), portrait = raceCameraView(0, true), first = raceCameraView(1, false);
/** Share of the vertical FOV between the rear bumper's road contact and the top of the nose. */
const frameFill = (back, height, fov) =>
  (deg(Math.atan(height / (back - CAR_HALF_LENGTH))) - deg(Math.atan((height - CAR_HEIGHT) / (back + CAR_HALF_LENGTH)))) / fov;
const horizontalFov = (fov, aspect) => 2 * deg(Math.atan(Math.tan(fov * Math.PI / 360) * aspect));
/** Where a point `ahead` m in front of the camera and `y` m above the road lands on screen: 0 top, 1 bottom. */
const screenY = (view, speed, ahead, y, sprint = 0) => {
  const eye = rigHeight(view, 0), pitch = Math.atan((eye - view.look) / (rigBack(view, speed, sprint) + view.ahead));
  return 0.5 + 0.5 * Math.tan(Math.atan((eye - y) / ahead) - pitch) / Math.tan(rigFov(view, speed) * Math.PI / 360);
};
const settle = (swing, yaw, view, seconds, fps = 60) => {
  for (let i = 0; i < Math.round(seconds * fps); i++) swing = stepCameraSwing(swing, yaw, view, 1 / fps);
  return swing;
};

test('one table drives every race view and each orientation resolves to its own row', () => {
  assert.equal(chase, RACE_CAMERA.chase);
  assert.equal(portrait, RACE_CAMERA.chasePortrait);
  assert.equal(first, RACE_CAMERA.first);
  assert.equal(raceCameraView(1, true), RACE_CAMERA.first, 'first person has one row for both orientations');
  for (const [name, row] of Object.entries(RACE_CAMERA)) for (const [key, value] of Object.entries(row))
    assert.ok(Number.isFinite(value), `${name}.${key}`);
});

test('the chase camera sits closer and lower than the old rig in both orientations', () => {
  for (const [view, old] of [[chase, OLD.landscape], [portrait, OLD.portrait]]) {
    assert.ok(rigBack(view, 0) < old.back - 2, `back ${rigBack(view, 0)} vs ${old.back}`);
    assert.ok(rigHeight(view, 0) < old.height - 1, `height ${rigHeight(view, 0)} vs ${old.height}`);
  }
});

test('landscape chase: the car fills about a third of the frame height and its rear bumper stays in frame', () => {
  const back = rigBack(chase, 0), height = rigHeight(chase, 0), fov = rigFov(chase, 0);
  const fill = frameFill(back, height, fov);
  assert.ok(fill > 0.28 && fill < 0.4, `fill ${fill.toFixed(3)}`);
  assert.ok(fill > 1.4 * frameFill(OLD.landscape.back, OLD.landscape.height, OLD.fov), 'clearly larger than before');
  const pitch = deg(Math.atan((height - chase.look) / (back + chase.ahead)));
  const bumper = deg(Math.atan(height / (back - CAR_HALF_LENGTH)));
  assert.ok(bumper < fov / 2 + pitch - 0.05 * fov, `bumper ${bumper.toFixed(1)} deg below the horizon must clear the bottom edge by 5% of the frame`);
});

test('portrait chase stays further back: the narrow horizontal FOV still holds the car, straight and sideways', () => {
  assert.ok(rigBack(portrait, 0) > rigBack(chase, 0) + 2);
  const back = rigBack(portrait, 0), across = horizontalFov(rigFov(portrait, 0), PHONE_PORTRAIT);
  const straight = 2 * deg(Math.atan(CAR_WIDTH / 2 / (back - CAR_HALF_LENGTH)));
  assert.ok(straight < 0.5 * across, `straight car ${straight.toFixed(1)} of ${across.toFixed(1)} deg`);
  const flank = DRIFT_YAW + Math.abs(settle(0, DRIFT_YAW, portrait, 3));
  const sideways = CAR_WIDTH * Math.cos(flank) + 2 * CAR_HALF_LENGTH * Math.sin(flank);
  assert.ok(2 * deg(Math.atan(sideways / 2 / back)) < 0.9 * across, 'a drifting car fits the portrait width');
});

test('portrait chase looks down enough to hold the car mid-frame, above the HUD readouts', () => {
  // On a 390x844 phone the altitude and speed readouts start 60% down the screen; the old rig left the car under them.
  // sprint 1: the NITRO/BOOST pull-back must not drop the car under the readouts either.
  for (const [speed, sprint] of [[60, 0], [MAX_SPEED, 0], [MAX_SPEED, 1], [MAX_SPEED + NITRO_CAP_BONUS, 0], [MAX_SPEED + NITRO_CAP_BONUS, 1]]) {
    const back = rigBack(portrait, speed, sprint), bumper = screenY(portrait, speed, back - CAR_HALF_LENGTH, 0, sprint);
    assert.ok(bumper < 0.61, `rear bumper at ${bumper.toFixed(3)} of the height at ${speed} m/s, sprint ${sprint}`);
    assert.ok(screenY(portrait, speed, back, CAR_HEIGHT, sprint) > 0.42, 'the car stays in the lower half, not floating mid-sky');
    assert.ok(screenY(portrait, speed, 1e6, 0) > 0.36, 'the horizon keeps the road ahead and the rings in view');
  }
});

test('classic roads: the portrait camera stays behind a car at the road edge, so a drift there fits the width', () => {
  assert.equal(chase.follow, 0.74, 'landscape keeps the lateral drift of the car across the frame');
  assert.equal(first.follow, 1);
  const back = rigBack(portrait, MAX_SPEED), half = back * Math.tan(horizontalFov(rigFov(portrait, MAX_SPEED), PHONE_PORTRAIT) * Math.PI / 360);
  const flank = DRIFT_YAW + Math.abs(settle(0, DRIFT_YAW, portrait, 3));
  const sideways = CAR_WIDTH * Math.cos(flank) + 2 * CAR_HALF_LENGTH * Math.sin(flank);
  const reach = (1 - portrait.follow) * ROAD_LIMIT + sideways / 2;
  assert.ok(reach < 0.75 * half, `car reaches ${reach.toFixed(2)} m of a ${half.toFixed(2)} m half-width`);
});

test('speed pulls the chase camera back slightly and widens the FOV; first person never moves its eye', () => {
  const top = MAX_SPEED + NITRO_CAP_BONUS;
  for (const view of [chase, portrait]) {
    assert.ok(rigBack(view, MAX_SPEED) > rigBack(view, 0));
    assert.ok(rigBack(view, top) - rigBack(view, 0) <= 1.6, 'a slight pull-back, never a zoom-out');
    assert.ok(rigBack(view, top) < (view === chase ? OLD.landscape : OLD.portrait).back, 'still closer than the old rig at top speed');
    assert.ok(rigFov(view, MAX_SPEED) - rigFov(view, 0) >= 3);
    assert.ok(rigFov(view, top) <= 80, 'no fisheye before the sprint kick is added');
  }
  assert.equal(rigBack(first, top), rigBack(first, 0));
  assert.ok(rigFov(first, MAX_SPEED) > rigFov(first, 0));
});

test('FLY lifts the chase camera so the road under the car stays in view', () => {
  for (const view of [chase, portrait]) {
    assert.ok(rigHeight(view, 8) > rigHeight(view, 0) + 1);
    assert.ok(rigHeight(view, 4) >= rigHeight(view, 1), 'monotonic');
    assert.equal(rigHeight(view, 200), rigHeight(view, 20), 'bounded');
  }
  assert.equal(rigHeight(first, 8), rigHeight(first, 0));
});

test('a drift swings the camera to the outside so the flank shows, with lag', () => {
  for (const yaw of [DRIFT_YAW, -DRIFT_YAW]) {
    const early = settle(0, yaw, chase, 0.1), held = settle(0, yaw, chase, 3);
    assert.equal(Math.sign(held), -Math.sign(yaw), 'the camera orbits against the car yaw');
    assert.ok(Math.abs(early) < 0.5 * Math.abs(held), 'the camera lags the car');
    assert.ok(deg(Math.abs(yaw) + Math.abs(held)) > 33, `flank angle ${deg(Math.abs(yaw) + Math.abs(held)).toFixed(1)} deg`);
    assert.ok(deg(Math.abs(held)) < 20, 'the road ahead stays in frame');
  }
  assert.ok(Math.abs(settle(0, DRIFT_YAW, portrait, 3)) < Math.abs(settle(0, DRIFT_YAW, chase, 3)), 'portrait swings less');
  assert.equal(settle(0, DRIFT_YAW, first, 3), 0, 'first person looks down the road, not sideways');
  assert.equal(stepCameraSwing(0, 0, chase, 1 / 60), 0);
});

test('the camera returns to centre shortly after the drift, slower than it swung out', () => {
  const held = settle(0, DRIFT_YAW, chase, 3);
  assert.ok(Math.abs(settle(held, 0, chase, 1.5)) < 0.05 * Math.abs(held), 'settled within 1.5 s');
  const out = Math.abs(settle(0, DRIFT_YAW, chase, 0.2)) / Math.abs(held);
  const back = 1 - Math.abs(settle(held, 0, chase, 0.2)) / Math.abs(held);
  assert.ok(back < out, 'return is gentler than the swing');
});

test('the swing is frame-rate independent and survives bad input', () => {
  const at = fps => settle(0, DRIFT_YAW, chase, 0.5, fps);
  assert.ok(Math.abs(at(30) - at(60)) < 1e-9 && Math.abs(at(120) - at(60)) < 1e-9);
  for (const bad of [NaN, Infinity, -1]) assert.equal(stepCameraSwing(0.1, DRIFT_YAW, chase, bad), 0.1, `dt ${bad}`);
  assert.equal(stepCameraSwing(0.1, NaN, chase, 1 / 60), 0.1);
});

test('first person sits at a seated eye height over the nose, not on the roof or inside the cabin', () => {
  const eye = rigHeight(first, 0), ahead = -rigBack(first, 0);
  assert.ok(eye < OLD.firstHeight - 0.4 && eye >= 0.9 && eye <= CAR_HEIGHT + 0.05, `eye ${eye}`);
  assert.ok(ahead >= WINDSCREEN_BASE + 0.3, `eye ${ahead} m ahead: in front of the windscreen, or the cabin shell cuts across the view`);
  // A sunlit bonnet in frame blooms into a white wash over the lower half of a phone screen: keep it under the bottom edge.
  const nose = deg(Math.atan((eye - NOSE_TOP) / (NOSE_TIP - ahead)));
  assert.ok(ahead < CAR_HALF_LENGTH, 'still on the car, so the eye never pokes into a car it is about to touch');
  assert.ok(nose > rigFov(first, MAX_SPEED + NITRO_CAP_BONUS) / 2 + 5, `the nose sits ${nose.toFixed(1)} deg below the horizon, outside the frame`);
});

// A NITRO/BOOST used to shake the camera at 8.4 Hz for as long as it lasted (±0.14° on the default setting, ±1.25° on
// the strongest): speed now reads through the FOV, the pull-back and the lens, and the shake is only the speed tremble.
test('shake: first person trembles with speed; the chase stays calm and a NITRO/BOOST adds no sustained shake', () => {
  const top = MAX_SPEED + NITRO_CAP_BONUS;
  assert.equal(rigShake.length, 3, 'view, speed, setting: the sprint strength is not an input any more');
  assert.equal(rigShake(first, 0, 0.15), 0);
  assert.ok(rigShake(first, MAX_SPEED, 0.15) > rigShake(first, MAX_SPEED / 2, 0.15));
  for (const view of [chase, portrait]) assert.equal(rigShake(view, top, 1), 0);
  assert.equal(rigShake(first, top, 0), 0, 'the Camera shake setting at 0 turns it off');
  assert.ok(rigShake(first, top, 1) < 0.03, 'under 2 degrees even on the strongest setting');
  assert.ok(rigShake(first, top, 0.15) < 0.006, 'subtle on the default setting');
  assert.equal(rigShake(first, NaN, NaN), 0);
});

test('NITRO/BOOST ignition: one short, low-frequency kick that dies out', () => {
  assert.equal(typeof rig.rigKick, 'function', 'the ignition kick lives in the rig module');
  for (const view of [chase, portrait, first]) for (const setting of [0.15, 0.3, 1]) {
    const samples = Array.from({ length: 121 }, (_, i) => rig.rigKick(view, i / 240, setting)); // 0 to 0.5 s
    const peak = Math.max(...samples.map(Math.abs));
    assert.equal(samples[0], 0, 'starts from rest: nothing pops on the ignition frame');
    assert.ok(deg(peak) >= 0.1 && deg(peak) <= 0.4, `setting ${setting} peaks at ${deg(peak).toFixed(3)} degrees`);
    assert.ok(samples.slice(60).every(value => value === 0), 'over within a quarter of a second');
    const live = samples.slice(1, 60), flips = live.filter((value, i) => i > 0 && value * live[i - 1] < 0).length;
    assert.ok(flips <= 2, `${flips} direction changes: a 4 to 6 Hz jolt, not a buzz`);
    const rebound = Math.max(...samples.slice(samples.findIndex((value, i) => i > 0 && value <= 0)).map(Math.abs));
    assert.ok(rebound < peak / 2, 'each swing is under half of the one before');
  }
  assert.equal(rig.rigKick(chase, 0.05, 0), 0, 'the Camera shake setting at 0 turns it off');
  for (const age of [NaN, -1, Infinity]) assert.equal(rig.rigKick(chase, age, 1), 0);
  assert.equal(rig.rigKick(chase, 0.05, NaN), 0);
});

test('NITRO/BOOST pulls the chase camera back so the car surges ahead; first person never moves its eye', () => {
  const top = MAX_SPEED + NITRO_CAP_BONUS;
  for (const view of [chase, portrait]) {
    const pull = rigBack(view, MAX_SPEED, 1) - rigBack(view, MAX_SPEED, 0);
    assert.ok(pull >= 0.6 && pull <= 1.2, `${pull} m`);
    assert.ok(Math.abs(rigBack(view, MAX_SPEED, 0.5) - rigBack(view, MAX_SPEED, 0) - pull / 2) < 1e-9, 'follows the eased sprint share');
    assert.equal(rigBack(view, MAX_SPEED, NaN), rigBack(view, MAX_SPEED, 0));
    assert.equal(rigBack(view, MAX_SPEED), rigBack(view, MAX_SPEED, 0));
    assert.ok(rigBack(view, top, 1) < (view === chase ? OLD.landscape : OLD.portrait).back, 'still closer than the old rig');
  }
  assert.equal(rigBack(first, top, 1), rigBack(first, top, 0));
});

test('world.js takes its race camera numbers from the table', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  for (const name of ['raceCameraView', 'rigBack', 'rigHeight', 'rigFov', 'rigShake', 'rigKick', 'stepCameraSwing'])
    assert.ok(world.includes(`${name}(`), `world.js calls ${name}`);
  assert.ok(!/portrait \? 14\.5 : 12\.5|57 \+ visualCar\.speed/.test(world), 'the old inline offsets and FOV are gone');
  assert.ok(!/time \* 65|boostStrength \* \(visual\.enabled \? 0\.22|rigShake\([^)]*boostStrength/.test(world),
    'no sprint shake outside the rig: the 10 Hz ignition sway, the world-Z push and the sustained boost shake are gone');
});
