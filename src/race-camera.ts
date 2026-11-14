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
  /** Metres further back per m/s, and at a full NITRO/BOOST (the car surges ahead of the camera). */
  speedBack: number;
  sprintBack: number;
  /** Extra metres at the peak of the ignition punch: the car leaps ahead, then the camera catches up to `sprintBack`. */
  punchBack: number;
  /** Extra eye height once fully airborne (reached at `flyAltitude` m). */
  flyLift: number;
  flyAltitude: number;
  /** Share of the car's drift yaw the camera orbits the other way, and how fast it gets there / comes back (1/s). */
  swing: number;
  swingIn: number;
  swingOut: number;
  /** Shake amplitude in radians at top speed, before the player's Camera shake setting. */
  speedShake: number;
  /** NITRO/BOOST ignition kick: radians of pitch per unit of the Camera shake setting, capped at KICK_LIMIT. */
  kick: number;
}

const SHARED = { speedFov: 0.115, flyAltitude: 6, swingIn: 4.5, swingOut: 3, kick: 0.085 };
/** The kick is one damped swing: seconds it lasts, its frequency, and the most it may turn the camera (1.2 degrees). */
const KICK_TIME = 0.35, KICK_HZ = 4, KICK_LIMIT = 0.021;

export const RACE_CAMERA: Record<'chase' | 'chasePortrait' | 'first', RaceCameraView> = {
  chase: { ...SHARED, back: 7.6, height: 2.5, look: 1.5, ahead: 34, follow: 0.74, fov: 57, speedBack: 0.012, sprintBack: 0.9, punchBack: 1, flyLift: 1.5, swing: 0.5, speedShake: 0 },
  // Portrait's horizontal FOV is about half of landscape's: further back, wider, straight behind the car and a smaller swing
  // keep a sideways car in frame. It aims below the road so the car sits mid-frame, above the HUD readouts.
  chasePortrait: { ...SHARED, back: 12, height: 3, look: -4, ahead: 34, follow: 0.95, fov: 61, speedBack: 0.012, sprintBack: 0.9, punchBack: 1, flyLift: 1.5, swing: 0.25, speedShake: 0 },
  // Seated eye height over the nose tip: ahead of the cabin shell and far enough forward that the sunlit bonnet (which
  // blooms into a white wash on phones) stays under the frame. It looks down the road, so no swing, pull-back or lift.
  first: { ...SHARED, back: -2.3, height: 1, look: 0.95, ahead: 65, follow: 1, fov: 60, speedBack: 0, sprintBack: 0, punchBack: 0, flyLift: 0, swing: 0, speedShake: 0.009 },
};

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const unit = (value: number) => Math.min(1, Math.max(0, finite(value)));

/** `mode` is world.cycleCamera()'s index: 0 chase, 1 first person. Returns the table row itself (no allocation). */
export const raceCameraView = (mode: number, portrait: boolean): RaceCameraView =>
  mode === 1 ? RACE_CAMERA.first : portrait ? RACE_CAMERA.chasePortrait : RACE_CAMERA.chase;

/** `sprint` and `punch` are the eased NITRO/BOOST share and ignition punch (0–1) from createSprintVfx: the pull-back never steps. */
export const rigBack = (view: RaceCameraView, speed: number, sprint = 0, punch = 0): number =>
  view.back + Math.max(0, finite(speed)) * view.speedBack + unit(sprint) * view.sprintBack + unit(punch) * view.punchBack;

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
 * input: a shake held for the whole sprint reads as judder, so the sprint shows in the FOV, the pull-back and rigKick.
 */
export function rigShake(view: RaceCameraView, speed: number, strength: number): number {
  const pace = unit(speed / MAX_SPEED);
  return unit(strength) * pace * pace * view.speedShake;
}

/** Pitch in radians `age` seconds after a NITRO/BOOST ignition: one damped swing from rest, 0 once it is over. */
export function rigKick(view: RaceCameraView, age: number, strength: number): number {
  if (!(age >= 0 && age < KICK_TIME)) return 0;
  return Math.min(KICK_LIMIT, unit(strength) * view.kick) * Math.sin(2 * Math.PI * KICK_HZ * age) * (1 - age / KICK_TIME) ** 2;
}
