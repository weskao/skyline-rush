import type { Vector3 } from 'three';
// In-race camera rig: one tunable table plus the pure math that reads it. src/world.js owns the Three.js camera
// and only applies these numbers; the ready-screen showcase views live in src/track-preview.ts.
import { MAX_SPEED } from './drive-rules.ts';

/** One row per race view. Metres and degrees unless noted; angles the camera turns by are radians. */
export interface RaceCameraView {
  /** Distance behind the car origin (negative = ahead of it). */
  back: number;
  /** Eye height above the car origin. */
  height: number;
  /** Look-at point: height above the car and distance down the road. */
  look: number;
  ahead: number;
  /** Classic flat roads: share of the car's lateral position the camera follows (1 = always straight behind). */
  follow: number;
  /** Vertical FOV at rest, and the degrees added per m/s. */
  fov: number;
  speedFov: number;
  /** Share of the dolly zoom: as the FOV widens the eye moves in so the car keeps its screen size (0 = fixed eye). */
  dolly: number;
  /** Extra eye height once fully airborne (reached at `flyAltitude` m). */
  flyLift: number;
  flyAltitude: number;
  /** Share of the car's drift yaw the camera orbits the other way, and how fast it gets there / comes back (1/s). */
  swing: number;
  swingIn: number;
  swingOut: number;
  /** Shake amplitude in radians at top speed, before the player's Camera shake setting. */
  speedShake: number;
  /** Road rumble: metres of eye translation at top speed per unit of the Camera shake setting, capped at RUMBLE_LIMIT. */
  rumble: number;
  /** NITRO/BOOST ignition kick: radians of pitch per unit of the Camera shake setting, capped at KICK_LIMIT. */
  kick: number;
  /** Hit / touchdown jolt: metres of eye translation at a full event per unit of the Camera shake setting, capped at JOLT_LIMIT. */
  jolt: number;
}

const SHARED = { speedFov: 0.115, flyAltitude: 6, swingIn: 4.5, swingOut: 3, kick: 0.085, jolt: 0.5 };
/** The kick is one damped swing: seconds it lasts, its frequency, and the most it may turn the camera (1.2 degrees). */
const KICK_TIME = 0.35, KICK_HZ = 4, KICK_LIMIT = 0.021;
/** The most a hit or a touchdown may move the eye (m). */
const JOLT_LIMIT = 0.2;
/** The dolly pivots on the rear bumper (m behind the origin) and stops widening at DOLLY_MAX_FOV degrees. */
const DOLLY_PIVOT = 2.4, DOLLY_MAX_FOV = 170;
/** Rumble: extra share at a full NITRO/BOOST, the most it may move the eye (m), its slow road waves and fine tyre buzz (Hz). */
const RUMBLE_SPRINT = 0.8, RUMBLE_LIMIT = 0.05, RUMBLE_HZ = [1.3, 2.1, 2.9, 1.7, 2.6] as const, RUMBLE_BUZZ_HZ = 17;
/** Longest frame (s) that still carries the buzz: 2.5 samples per cycle, or it folds back into a slow wobble. */
const RUMBLE_BUZZ_DT = 1 / (2.5 * RUMBLE_BUZZ_HZ);

export const RACE_CAMERA: Record<'chase' | 'chasePortrait' | 'first', RaceCameraView> = {
  chase: { ...SHARED, back: 7.6, height: 2.5, look: 1.5, ahead: 34, follow: 0.74, fov: 57, dolly: 1, flyLift: 1.5, swing: 0.5, speedShake: 0, rumble: 0.12 },
  // Portrait's horizontal FOV is about half of landscape's: further back, wider, straight behind the car and a smaller swing
  // keep a sideways car in frame. It aims below the road so the car sits mid-frame, above the HUD readouts; the lower eye
  // keeps the rear bumper above them once the dolly has moved in.
  chasePortrait: { ...SHARED, back: 12, height: 2.5, look: -4, ahead: 34, follow: 0.97, fov: 61, dolly: 1, flyLift: 1.5, swing: 0.25, speedShake: 0, rumble: 0.12 },
  // Seated eye height over the nose tip: ahead of the cabin shell and far enough forward that the sunlit bonnet (which
  // blooms into a white wash on phones) stays under the frame. It looks down the road, so no swing, dolly, lift or rumble.
  first: { ...SHARED, back: -2.3, height: 1, look: 0.95, ahead: 65, follow: 1, fov: 60, dolly: 0, flyLift: 0, swing: 0, speedShake: 0.009, rumble: 0 },
};

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const unit = (value: number) => Math.min(1, Math.max(0, finite(value)));

/** `mode` is world.cycleCamera()'s index: 0 chase, 1 first person. Returns the table row itself (no allocation). */
export const raceCameraView = (mode: number, portrait: boolean): RaceCameraView =>
  mode === 1 ? RACE_CAMERA.first : portrait ? RACE_CAMERA.chasePortrait : RACE_CAMERA.chase;

const halfTan = (fov: number) => Math.tan(fov * Math.PI / 360);
const dollyFov = (view: RaceCameraView, fov: number) => Math.min(DOLLY_MAX_FOV, Math.max(view.fov, finite(fov, view.fov)));
/**
 * Dolly zoom: distance behind the car for the chase FOV (speed + sprint + punch, no impact pinch). The eye moves in as
 * the FOV widens so the car keeps its standstill size while the background stretches; a narrower FOV never pulls back.
 */
export const rigBack = (view: RaceCameraView, fov: number): number =>
  view.back + view.dolly * (view.back - DOLLY_PIVOT) * (halfTan(view.fov) / halfTan(dollyFov(view, fov)) - 1);

/** Look-at height for the dolly: re-aims the closer, wider camera so the horizon and the rear bumper keep their screen rows. */
export function rigLook(view: RaceCameraView, fov: number): number {
  const f = dollyFov(view, fov), spread = 1 + view.dolly * (halfTan(f) / halfTan(view.fov) - 1);
  return view.height - (view.height - view.look) * (rigBack(view, f) + view.ahead) / (view.back + view.ahead) * spread;
}

export const rigHeight = (view: RaceCameraView, altitude: number): number => view.height + unit(altitude / view.flyAltitude) * view.flyLift;

/** Base FOV for the speed; the sprint kick and impact pinch are added by the caller. */
export const rigFov = (view: RaceCameraView, speed: number): number => view.fov + Math.max(0, finite(speed)) * view.speedFov;

/**
 * Keep the chase car inside a narrow viewport when the road immediately bends
 * away from the car's heading. Preserve the look target's height and distance.
 */
export function frameChaseSightline(eye: Vector3, look: Vector3, car: Vector3, aspect: number, verticalFov: number): void {
  const heading = Math.atan2(car.x - eye.x, car.z - eye.z);
  const dx = look.x - eye.x, dz = look.z - eye.z;
  const offset = Math.atan2(Math.sin(Math.atan2(dx, dz) - heading), Math.cos(Math.atan2(dx, dz) - heading));
  const limit = Math.atan(.5 * aspect * Math.tan(verticalFov * Math.PI / 360));
  if (Math.abs(offset) <= limit) return;
  const angle = heading + Math.sign(offset) * limit, reach = Math.hypot(dx, dz);
  look.x = eye.x + Math.sin(angle) * reach;
  look.z = eye.z + Math.cos(angle) * reach;
}

/**
 * Camera orbit around the car (radians, same sense as the car's yaw). It trails the drift yaw towards the opposite
 * side, so the flank turns into view, then eases back to centre more slowly once the car straightens.
 */
export function stepCameraSwing(swing: number, driftYaw: number, view: RaceCameraView, dt: number): number {
  if (!Number.isFinite(dt) || dt < 0 || !Number.isFinite(driftYaw)) return swing;
  const target = -driftYaw * view.swing;
  const rate = Math.abs(target) > Math.abs(swing) ? view.swingIn : view.swingOut;
  return target + (swing - target) * Math.exp(-rate * dt);
}

/**
 * Continuous speed tremble in radians; `strength` is the player's Camera shake setting (0–1). A NITRO/BOOST is not an
 * input: a shake held for the whole sprint reads as judder, so the sprint shows in the FOV, the dolly, rigKick and rigRumble.
 */
export function rigShake(view: RaceCameraView, speed: number, strength: number): number {
  const pace = unit(speed / MAX_SPEED);
  return unit(strength) * pace * pace * view.speedShake;
}

/**
 * Road rumble written to `out` (camera-local metres, z 0): slow 1-3 Hz road waves plus a fine tyre buzz, growing with the
 * square of the speed and with the eased sprint share. A translation, not a rotation: the car and the road move a few cm
 * while the horizon stays still, so it never reads as the old judder. `strength` is the Camera shake setting. `floor`
 * (rumbleFloor) lifts the top-speed amplitude to one rendered row; `dt` is the frame time, and the buzz is dropped when the
 * frame rate cannot carry it (0 = unknown, keeps it).
 */
export function rigRumble(view: RaceCameraView, speed: number, sprint: number, strength: number, time: number, out: Vector3, floor = 0, dt = 0): Vector3 {
  const pace = unit(speed / MAX_SPEED), on = unit(strength) > 0 && view.rumble > 0;
  const amp = on ? Math.min(RUMBLE_LIMIT, Math.max(unit(strength) * view.rumble, finite(floor)) * (1 + RUMBLE_SPRINT * unit(sprint))) * pace * pace : 0;
  if (!(amp > 0)) return out.set(0, 0, 0);
  const t = 2 * Math.PI * finite(time), [a, b, c, d, e] = RUMBLE_HZ, buzz = finite(dt) > RUMBLE_BUZZ_DT ? 0 : 0.1;
  const y = 0.9 * (Math.sin(a * t) + 0.6 * Math.sin(b * t + 1.7) + 0.4 * Math.sin(c * t + 4.1)) / 2 + buzz * Math.sin(RUMBLE_BUZZ_HZ * t);
  const x = (Math.sin(d * t + 0.6) + 0.5 * Math.sin(e * t + 2.3)) / 1.5;
  return out.set(0.45 * amp * x, 0.85 * amp * y, 0); // |(x, y)| <= amp
}

/** Metres of eye motion that move something `distance` m away by one row of a `rows`-tall frame at `fov` degrees. */
export function rumbleFloor(distance: number, fov: number, rows: number): number {
  const metres = 2 * distance * Math.tan(fov * Math.PI / 360) / rows;
  return distance > 0 && rows > 0 && Number.isFinite(metres) && metres > 0 ? metres : 0;
}

/**
 * Hit / touchdown jolt written to `out` (camera-local metres, z 0). `impact` and `landing` are world.js's 0–1 event
 * envelopes: a hit shakes both axes at ~8-10 Hz, a landing thumps y. Applied after lookAt like the rumble, because the
 * camera lerp (1 - e^(-7 dt)) keeps only ~11% of a 9.7 Hz shake. `strength` is the Camera shake setting.
 */
export function rigJolt(view: RaceCameraView, impact: number, landing: number, strength: number, time: number, out: Vector3): Vector3 {
  const amp = Math.min(JOLT_LIMIT, unit(strength) * view.jolt), hit = unit(impact), thump = unit(landing), t = finite(time);
  if (!(amp > 0) || hit + thump === 0) return out.set(0, 0, 0);
  const y = (0.6 * hit * Math.sin(t * 47) + 0.8 * thump * Math.sin(t * 41)) / Math.max(1, 0.6 * hit + 0.8 * thump);
  return out.set(amp * hit * Math.sin(t * 61), amp * y, 0);
}

/** Pitch in radians `age` seconds after a NITRO/BOOST ignition: one damped swing from rest, 0 once it is over. */
export function rigKick(view: RaceCameraView, age: number, strength: number): number {
  if (!(age >= 0 && age < KICK_TIME)) return 0;
  return Math.min(KICK_LIMIT, unit(strength) * view.kick) * Math.sin(2 * Math.PI * KICK_HZ * age) * (1 - age / KICK_TIME) ** 2;
}
