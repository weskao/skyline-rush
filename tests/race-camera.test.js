import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import * as rig from '../src/race-camera.ts';
import { RACE_CAMERA, raceCameraView, rigBack, rigHeight, rigFov, rigShake, stepCameraSwing } from '../src/race-camera.ts';
import { CAR_HEIGHT, ROAD_LIMIT } from '../src/game.js';
import { MAX_SPEED, NITRO_CAP_BONUS } from '../src/drive-rules.ts';
import { VFX_RANGES, NITRO_CHAIN_LIFT, sprintFovOffset } from '../src/vfx-settings.ts';

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
const TOP = MAX_SPEED + NITRO_CAP_BONUS, DEFAULT_FOV = VFX_RANGES.fov[4], STRONGEST_FOV = VFX_RANGES.fov[2];
/** The rig at a speed plus the sprint's FOV degrees (sprintFovOffset): FOV, dolly distance, look height and eye height. */
const rigAt = (view, speed, sprintFov = 0) => {
  const fov = rigFov(view, speed) + sprintFov;
  return { fov, back: rigBack(view, fov), look: typeof rig.rigLook === 'function' ? rig.rigLook(view, fov) : view.look, eye: rigHeight(view, 0) };
};
const sprintFov = (setting, power, punch = 0) => sprintFovOffset({ fov: power, punch }, { enabled: true, fov: setting });
/** Cruise to NITRO top speed with the FOV setting `setting`: held BOOST, its ignition punch, NITRO, and a ×3 NITRO punch. */
const sprintStates = setting => [
  ['cruise', MAX_SPEED, 0], ['BOOST', MAX_SPEED, sprintFov(setting, 1)], ['BOOST punch', MAX_SPEED, sprintFov(setting, 1, 1)],
  ['NITRO top', TOP, sprintFov(setting, 1)], ['NITRO x3 punch', TOP, sprintFov(setting, NITRO_CHAIN_LIFT.at(-1), NITRO_CHAIN_LIFT.at(-1))],
];
/** Share of the vertical FOV between the rear bumper's road contact and the top of the nose. */
const frameFill = (back, height, fov) =>
  (deg(Math.atan(height / (back - CAR_HALF_LENGTH))) - deg(Math.atan((height - CAR_HEIGHT) / (back + CAR_HALF_LENGTH)))) / fov;
const horizontalFov = (fov, aspect) => 2 * deg(Math.atan(Math.tan(fov * Math.PI / 360) * aspect));
/** Where a point `ahead` m in front of the camera and `y` m above the road lands on screen: 0 top, 1 bottom. */
const screenY = (view, state, ahead, y) => {
  const pitch = Math.atan((state.eye - state.look) / (state.back + view.ahead));
  return 0.5 + 0.5 * Math.tan(Math.atan((state.eye - y) / ahead) - pitch) / Math.tan(state.fov * Math.PI / 360);
};
/** Screen share (0-1 of width and height) of the car's box seen through the rig on a straight road. */
const carOnScreen = (view, state, aspect) => {
  const eye = new Vector3(0, state.eye, state.back), ahead = new Vector3(0, state.look, -view.ahead).sub(eye).normalize();
  const right = new Vector3(1, 0, 0), up = new Vector3().crossVectors(right, ahead).negate(), t = Math.tan(state.fov * Math.PI / 360);
  const xs = [], ys = [];
  for (const x of [-CAR_WIDTH / 2, CAR_WIDTH / 2]) for (const y of [0, CAR_HEIGHT]) for (const z of [-CAR_HALF_LENGTH, CAR_HALF_LENGTH]) {
    const p = new Vector3(x, y, z).sub(eye), depth = p.dot(ahead);
    xs.push(p.dot(right) / depth / (t * aspect)); ys.push(p.dot(up) / depth / t);
  }
  return { width: (Math.max(...xs) - Math.min(...xs)) / 2, height: (Math.max(...ys) - Math.min(...ys)) / 2 };
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
    assert.ok(rigAt(view, 0).back < old.back - 2, `back ${rigAt(view, 0).back} vs ${old.back}`);
    assert.ok(rigHeight(view, 0) < old.height - 1, `height ${rigHeight(view, 0)} vs ${old.height}`);
  }
});

test('landscape chase: the car fills about a third of the frame height and its rear bumper stays in frame', () => {
  const { back, eye: height, fov } = rigAt(chase, 0);
  const fill = frameFill(back, height, fov);
  assert.ok(fill > 0.28 && fill < 0.4, `fill ${fill.toFixed(3)}`);
  assert.ok(fill > 1.4 * frameFill(OLD.landscape.back, OLD.landscape.height, OLD.fov), 'clearly larger than before');
  const pitch = deg(Math.atan((height - chase.look) / (back + chase.ahead)));
  const bumper = deg(Math.atan(height / (back - CAR_HALF_LENGTH)));
  assert.ok(bumper < fov / 2 + pitch - 0.05 * fov, `bumper ${bumper.toFixed(1)} deg below the horizon must clear the bottom edge by 5% of the frame`);
});

test('portrait chase stays further back: the narrow horizontal FOV still holds the car, straight and sideways', () => {
  assert.ok(rigAt(portrait, 0).back > rigAt(chase, 0).back + 2);
  const { back, fov } = rigAt(portrait, 0), across = horizontalFov(fov, PHONE_PORTRAIT);
  const straight = 2 * deg(Math.atan(CAR_WIDTH / 2 / (back - CAR_HALF_LENGTH)));
  assert.ok(straight < 0.5 * across, `straight car ${straight.toFixed(1)} of ${across.toFixed(1)} deg`);
  const flank = DRIFT_YAW + Math.abs(settle(0, DRIFT_YAW, portrait, 3));
  const sideways = CAR_WIDTH * Math.cos(flank) + 2 * CAR_HALF_LENGTH * Math.sin(flank);
  assert.ok(2 * deg(Math.atan(sideways / 2 / back)) < 0.9 * across, 'a drifting car fits the portrait width');
});

test('portrait chase looks down enough to hold the car mid-frame, above the HUD readouts', () => {
  // On a 390x844 phone the altitude and speed readouts start 60% down the screen; the old rig left the car under them.
  // The dolly holds the car's size at speed, so the framing must hold from standstill to a x3 NITRO punch on the
  // strongest FOV setting (the widest the camera ever gets).
  for (const setting of [DEFAULT_FOV, STRONGEST_FOV]) for (const [name, speed, extra] of [['standstill', 0, 0], ['60 m/s', 60, 0], ...sprintStates(setting)]) {
    const state = rigAt(portrait, speed, extra), bumper = screenY(portrait, state, state.back - CAR_HALF_LENGTH, 0);
    assert.ok(bumper < 0.6, `rear bumper at ${bumper.toFixed(3)} of the height: ${name}, FOV setting ${setting}`);
    assert.ok(screenY(portrait, state, state.back, CAR_HEIGHT) > 0.42, 'the car stays in the lower half, not floating mid-sky');
    assert.ok(screenY(portrait, state, 1e6, 0) > 0.36, 'the horizon keeps the road ahead and the rings in view');
  }
});

test('classic roads: the portrait camera stays behind a car at the road edge, so a drift there fits the width', () => {
  assert.equal(chase.follow, 0.74, 'landscape keeps the lateral drift of the car across the frame');
  assert.equal(first.follow, 1);
  // The dolly keeps the car as large as at standstill, so the standstill framing is the tightest.
  for (const speed of [0, MAX_SPEED]) {
    const { back, fov } = rigAt(portrait, speed), half = back * Math.tan(horizontalFov(fov, PHONE_PORTRAIT) * Math.PI / 360);
    const flank = DRIFT_YAW + Math.abs(settle(0, DRIFT_YAW, portrait, 3));
    const sideways = CAR_WIDTH * Math.cos(flank) + 2 * CAR_HALF_LENGTH * Math.sin(flank);
    const reach = (1 - portrait.follow) * ROAD_LIMIT + sideways / 2;
    assert.ok(reach < 0.75 * half, `car reaches ${reach.toFixed(2)} m of a ${half.toFixed(2)} m half-width at ${speed} m/s`);
  }
});

// The old rig pulled back with speed (0.012 m per m/s, +0.9 m sprint, +1 m punch) on top of the wider FOV: in landscape the
// car shrank to about 72% of its standstill size at 88 m/s cruise, 57% in a held sprint and 52% at NITRO top speed.
test('dolly zoom: the chase car keeps its screen size from cruise to NITRO top speed while the background widens', () => {
  assert.equal(typeof rig.rigLook, 'function', 'the dolly also re-aims the camera so the framing holds');
  for (const [view, aspect] of [[chase, 1440 / 900], [portrait, PHONE_PORTRAIT]]) for (const setting of [DEFAULT_FOV, STRONGEST_FOV]) {
    const cruise = carOnScreen(view, rigAt(view, MAX_SPEED), aspect);
    for (const [name, speed, extra] of [['standstill', 0, 0], ...sprintStates(setting)]) {
      const car = carOnScreen(view, rigAt(view, speed, extra), aspect);
      for (const side of ['width', 'height']) {
        const ratio = car[side] / cruise[side];
        assert.ok(ratio > 0.9 && ratio < 1.1, `${view === chase ? 'landscape' : 'portrait'} ${name}, FOV setting ${setting}: car ${side} ${(ratio * 100).toFixed(1)}% of cruise`);
      }
    }
  }
  for (const view of [chase, portrait]) {
    assert.ok(rigFov(view, MAX_SPEED) - rigFov(view, 0) >= 3, 'speed still widens the FOV');
    assert.ok(rigFov(view, TOP) <= 80, 'no fisheye before the sprint is added');
    const cruise = rigAt(view, MAX_SPEED), nitro = rigAt(view, TOP, sprintFov(DEFAULT_FOV, 1, 1));
    assert.ok(nitro.fov - cruise.fov >= 12, `NITRO widens the background ${(nitro.fov - cruise.fov).toFixed(1)} deg past cruise`);
    assert.ok(cruise.back < rigAt(view, 0).back && nitro.back < cruise.back, 'a wider FOV dollies the camera in, never out');
    for (let fov = view.fov; fov < 110; fov += 0.5) assert.ok(rigBack(view, fov) - rigBack(view, fov + 0.5) < 0.1, 'continuous: no step');
  }
  for (const fov of [first.fov, 80, 110]) {
    assert.equal(rigBack(first, fov), first.back, 'first person never moves its eye');
    assert.equal(rig.rigLook(first, fov), first.look);
  }
  assert.ok(rigFov(first, MAX_SPEED) > rigFov(first, 0));
});

test('the dolly never brings the chase eye into the car, even at the widest FOV the settings allow', () => {
  const lift = NITRO_CHAIN_LIFT.at(-1);
  for (const view of [chase, portrait]) {
    const widest = rigAt(view, TOP, sprintFov(STRONGEST_FOV, lift, lift));
    assert.ok(widest.back - CAR_HALF_LENGTH >= 1.8, `eye ${(widest.back - CAR_HALF_LENGTH).toFixed(2)} m behind the rear bumper at ${widest.fov.toFixed(1)} deg`);
    assert.ok(widest.eye >= CAR_HEIGHT + 1, 'and above the roof');
    assert.equal(rigBack(view, 1000), rigBack(view, 170), 'bounded for any FOV');
    assert.equal(rigBack(view, NaN), rigBack(view, view.fov), 'bad input keeps the standstill distance');
    assert.equal(rigBack(view, 10), rigBack(view, view.fov), 'a narrower FOV (impact pinch) never pulls back');
  }
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

// 0.135 degrees on the default setting (the first sprint-pulse tune) was too faint to read as an ignition.
test('NITRO/BOOST ignition: one felt, low-frequency kick that dies out', () => {
  assert.equal(typeof rig.rigKick, 'function', 'the ignition kick lives in the rig module');
  for (const view of [chase, portrait, first]) for (const setting of [0.15, 0.3, 1]) {
    const samples = Array.from({ length: 121 }, (_, i) => rig.rigKick(view, i / 240, setting)); // 0 to 0.5 s
    const peak = Math.max(...samples.map(Math.abs));
    assert.equal(samples[0], 0, 'starts from rest: nothing pops on the ignition frame');
    assert.ok(deg(peak) >= (setting === 0.15 ? 0.4 : 0.1) && deg(peak) <= 0.9, `setting ${setting} peaks at ${deg(peak).toFixed(3)} degrees`);
    assert.ok(samples.slice(84).every(value => value === 0), 'over within 0.35 s');
    const live = samples.slice(1, 60), flips = live.filter((value, i) => i > 0 && value * live[i - 1] < 0).length;
    assert.ok(flips <= 2, `${flips} direction changes: a 4 to 6 Hz jolt, not a buzz`);
    const rebound = Math.max(...samples.slice(samples.findIndex((value, i) => i > 0 && value <= 0)).map(Math.abs));
    assert.ok(rebound < peak / 2, 'each swing is under half of the one before');
  }
  assert.equal(rig.rigKick(chase, 0.05, 0), 0, 'the Camera shake setting at 0 turns it off');
  for (const age of [NaN, -1, Infinity]) assert.equal(rig.rigKick(chase, age, 1), 0);
  assert.equal(rig.rigKick(chase, 0.05, NaN), 0);
});

// Road rumble replaces nothing: the sustained rotational shake stays gone. A translation moves near things (car, road) a
// few cm and leaves the horizon where it is, so it reads as tyres on asphalt, not as the 8.4 Hz judder.
test('road rumble: a small smooth translation that grows with speed and the sprint, never a rotation', () => {
  assert.equal(typeof rig.rigRumble, 'function', 'the rumble lives in the rig module');
  const out = new Vector3(), dt = 1 / 240;
  const trace = (view, speed, sprint, setting) => Array.from({ length: 6 / dt }, (_, i) => rig.rigRumble(view, speed, sprint, setting, i * dt, out).clone());
  const peak = samples => Math.max(...samples.map(v => v.length()));
  const cruise = trace(chase, MAX_SPEED, 0, 0.15), sprint = trace(chase, TOP, 1, 0.15);
  assert.ok(sprint.every(v => v.z === 0), 'camera-local x/y only: it never moves towards the car');
  assert.ok(peak(cruise) >= 0.008 && peak(cruise) <= 0.03, `cruise rumble ${peak(cruise).toFixed(4)} m on the default setting`);
  assert.ok(peak(sprint) >= 1.4 * peak(cruise) && peak(sprint) <= 0.04, `sprint rumble ${peak(sprint).toFixed(4)} m: more, still a few cm`);
  const near = rigAt(chase, TOP, sprintFov(DEFAULT_FOV, 1)).back - CAR_HALF_LENGTH;
  assert.ok(deg(Math.atan(peak(sprint) / near)) < 0.75, 'the car moves well under a degree');
  assert.ok(deg(Math.atan(peak(sprint) / 1000)) < 0.01, 'the horizon stays put');
  for (const view of [chase, portrait]) assert.ok(peak(trace(view, TOP, 1, 1)) <= 0.05, 'capped at 5 cm on the strongest setting');
  // Mostly 1-3 Hz: an 8.4 Hz shake of the same size moves 2 pi 8.4 = 53 x its amplitude per second.
  for (const samples of [cruise, sprint]) {
    const speedMax = Math.max(...samples.slice(1).map((v, i) => v.distanceTo(samples[i]) / dt));
    assert.ok(speedMax < 35 * peak(samples), `peak rate ${(speedMax / peak(samples)).toFixed(1)} x amplitude per second`);
  }
  assert.ok(peak(trace(chase, MAX_SPEED / 2, 0, 0.15)) < 0.5 * peak(cruise), 'grows with speed');
  assert.equal(peak(trace(chase, 0, 1, 1)), 0, 'standing still');
  assert.equal(peak(trace(chase, TOP, 1, 0)), 0, 'the Camera shake setting at 0 turns it off');
  assert.equal(peak(trace(first, TOP, 1, 1)), 0, 'first person keeps its own speed tremble only');
  assert.equal(rig.rigRumble(chase, NaN, NaN, NaN, NaN, out).length(), 0);
});

test('world.js takes its race camera numbers from the table', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  for (const name of ['raceCameraView', 'rigBack', 'rigLook', 'rigHeight', 'rigFov', 'rigShake', 'rigKick', 'rigRumble', 'stepCameraSwing'])
    assert.ok(world.includes(`${name}(`), `world.js calls ${name}`);
  assert.ok(!/speedBack|sprintBack|punchBack/.test(world + readFileSync(new URL('../src/race-camera.ts', import.meta.url), 'utf8')), 'no pull-back left');
  // The rumble is added after lookAt (a translation: the view does not turn) and taken off before the next lerp, so it
  // never feeds the smoothed camera position.
  const sub = world.indexOf('camera.position.sub(rumble)'), lerp = world.indexOf('camera.position.lerp(desiredCamera');
  assert.ok(sub > -1 && sub < lerp, 'the last rumble is removed before the lerp');
  assert.ok(world.indexOf('rigRumble(') > world.indexOf('camera.lookAt(smoothLook)'), 'the rumble is added after lookAt');
  assert.ok(!/portrait \? 14\.5 : 12\.5|57 \+ visualCar\.speed/.test(world), 'the old inline offsets and FOV are gone');
  assert.ok(!/time \* 65|boostStrength \* \(visual\.enabled \? 0\.22|rigShake\([^)]*boostStrength/.test(world),
    'no sprint shake outside the rig: the 10 Hz ignition sway, the world-Z push and the sustained boost shake are gone');
});
