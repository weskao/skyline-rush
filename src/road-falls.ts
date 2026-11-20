// Falling off the road: through a missing bridge section (gap) or out of a span corridor over a chasm.
// Shared by every track's player car in the one 1D engine (`game.js`).
import type { TrackSection } from './game-types.ts';

export const SHORTCUT_HALF_WIDTH = 3; // m either side of the corridor centre
export const SHORTCUT_TOLERANCE = 2.5; // m above or below the corridor altitude (also the pylon height)
export const DECK_DEPTH = .45; // m: a solid shortcut deck's slab under its top (the corridor floor)
export const SPAN_LANDING = 60; // m: a span's last stretch eases down to its corridor; sinking there rests on the deck

/** On a span corridor's deck or above it, inside its sides: where a span car stays and span objects are drawn. */
export const overSpan = (section: TrackSection, x: number, altitude: number): boolean =>
  Math.abs(x - (section.x ?? 0)) < SHORTCUT_HALF_WIDTH && altitude > (section.altitude ?? 0) - SHORTCUT_TOLERANCE;

export interface RecoverySeat {
  distance: number;
  course?: { edgeId: string; localS: number };
}

export interface RoadRecovery {
  falling: boolean;
  seat: RecoverySeat;
  elapsed: number;
  transferAt: number;
  reseated: boolean;
  speed: number;
  startAltitude: number;
  startVerticalSpeed: number;
  roll: number;
}

export interface FallingCar {
  distance: number; x: number; altitude: number; verticalSpeed: number; speed: number; cooldown: number; combo: number;
  drift: unknown; driftHold?: unknown; trick: unknown; poweredFlightTime: number; flightBoosted: boolean; falls: number;
  fall: { from: number; distance: number; time: number } | null; span?: boolean; recovery?: RoadRecovery;
  steering?: number; steerSign?: number; flick?: unknown; thrusting?: boolean; boosting?: boolean; braking?: boolean;
  cleanDistance?: number; flyBuffer?: number; nitroTime?: number; miniBoost?: number;
}

const FALL_TIME = .76;
const RESET_FADE_TIME = .18;
const LAND_TIME = .46;
const GRAVITY = 24;
const LAND_HEIGHT = 2.2;
export const RESET_BACKTRACK = 28; // m, before searching for a safer approach

export function startRoadRecovery(car: FallingCar, seat: RecoverySeat, from: number, time: number, slowdown: number, reason: 'fall' | 'reset' = 'fall', falling = reason === 'fall'): void {
  car.recovery = {
    falling, seat, elapsed: 0, transferAt: falling ? FALL_TIME : RESET_FADE_TIME, reseated: false,
    speed: car.speed, startAltitude: car.altitude, startVerticalSpeed: Math.min(0, car.verticalSpeed),
    roll: Math.sign(car.steering || car.x) || 1,
  };
  if (reason === 'fall') {
    car.falls++;
    car.fall = { from, distance: seat.distance, time };
  }
  car.recovery.speed *= slowdown;
  car.speed = 0;
  car.combo = car.cleanDistance = 0;
  car.drift = car.driftHold = car.trick = car.flick = null;
  car.poweredFlightTime = car.steerSign = car.steering = car.flyBuffer = 0;
  car.flightBoosted = car.thrusting = car.boosting = car.braking = false;
  car.nitroTime = car.miniBoost = 0;
}

/** Step only the recovery pose. Return the seat once, at the covered camera cut. */
export function advanceRoadRecovery(car: FallingCar, dt: number): RecoverySeat | undefined {
  const recovery = car.recovery!;
  recovery.elapsed += dt;
  const after = recovery.elapsed - recovery.transferAt;
  if (after < 0) {
    if (recovery.falling) {
      car.verticalSpeed = recovery.startVerticalSpeed - GRAVITY * recovery.elapsed;
      car.altitude = recovery.startAltitude + recovery.startVerticalSpeed * recovery.elapsed - GRAVITY * recovery.elapsed ** 2 / 2;
    }
    return;
  }

  const settling = Math.min(1, after / LAND_TIME);
  car.altitude = LAND_HEIGHT * (1 - settling ** 2);
  car.verticalSpeed = -2 * LAND_HEIGHT * settling / LAND_TIME;
  if (!recovery.reseated) {
    recovery.reseated = true;
    car.distance = recovery.seat.distance;
    car.x = 0;
    car.span = false;
    car.cooldown = 1.5;
    return recovery.seat;
  }
  if (settling === 1) {
    car.altitude = car.verticalSpeed = 0;
    car.speed = recovery.speed;
    delete car.recovery;
  }
}

const smooth = (x: number): number => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

export function roadRecoveryFade(recovery: RoadRecovery): number {
  const t = recovery.elapsed - recovery.transferAt;
  return t < 0 ? smooth(1 + t / (recovery.falling ? .24 : RESET_FADE_TIME)) : 1 - smooth(t / .20);
}

export function roadFallPose(recovery: RoadRecovery) {
  const t = recovery.elapsed / recovery.transferAt;
  return {
    forward: Math.min(12, recovery.speed * .6) * (1 - (1 - t) ** 2),
    pitch: .38 * t ** 2,
    roll: -.45 * recovery.roll * t ** 2,
  };
}

export const roadFallInProgress = (recovery: RoadRecovery | undefined): recovery is RoadRecovery =>
  !!recovery && !recovery.reseated && recovery.falling;

/**
 * Span corridor: reaching its band puts the car on the span; above it the car stays on. Sinking below its deck or
 * leaving its sides before the end is a failed jump: back to the corridor start on the ground road, never ahead.
 * On the landing ramp (last SPAN_LANDING m) a sinking car rests on the deck and rolls off at the end.
 */
export function stepSpan(car: FallingCar, section: TrackSection | undefined, time: number, slowdown: number): void {
  if (!section?.span || car.distance >= section.to) { car.span = false; return; }
  const over = overSpan(section, car.x, car.altitude);
  const floor = (section.altitude ?? 0) - SHORTCUT_TOLERANCE, ramp = car.distance >= section.to - SPAN_LANDING;
  if (car.span && ramp && !over && Math.abs(car.x - (section.x ?? 0)) < SHORTCUT_HALF_WIDTH) { car.altitude = floor; car.verticalSpeed = Math.max(0, car.verticalSpeed); }
  else if (car.span && !over) startRoadRecovery(car, { distance: section.from }, section.from, time, slowdown);
  else if (over && car.altitude < (section.altitude ?? 0) + SHORTCUT_TOLERANCE) car.span = true;
}

const CAR_HALF_WIDTH = .85; // m: half the car-vs-car box (|Δx| < 1.7)
/**
 * Solid deck (`section.deck`): a car body never sits inside the slab. Whichever side the car came from wins:
 * from below its roof stops at the underside, from above it rests on the top and drops off past the end or a side.
 */
export function stepDeck(car: Pick<FallingCar, 'distance' | 'x' | 'altitude' | 'verticalSpeed'>, section: TrackSection | undefined, previousAltitude: number, carHeight: number): void {
  if (!section?.deck || car.distance >= section.to || Math.abs(car.x - (section.x ?? 0)) >= SHORTCUT_HALF_WIDTH + CAR_HALF_WIDTH) return;
  const top = (section.altitude ?? 0) - SHORTCUT_TOLERANCE, under = top - DECK_DEPTH;
  if (car.altitude + carHeight <= under || car.altitude >= top) return;
  if (previousAltitude + carHeight / 2 < (top + under) / 2) { car.altitude = under - carHeight; car.verticalSpeed = Math.min(0, car.verticalSpeed); }
  else { car.altitude = top; car.verticalSpeed = Math.max(0, car.verticalSpeed); }
}

/** A rival's scripted hop (a time cycle, no vertical speed) obeys the same solid decks, from its last clamped altitude. */
export function stepRivalDeck(rival: { distance: number; x: number; altitude: number }, sections: readonly TrackSection[], previousAltitude: number, carHeight: number): void {
  if (!rival.altitude && !previousAltitude) return; // grounded, the common case: no section lookup
  const car = { distance: rival.distance, x: rival.x, altitude: rival.altitude, verticalSpeed: 0 };
  stepDeck(car, sections.find(s => car.distance >= s.from && car.distance < s.to), previousAltitude, carHeight);
  rival.altitude = car.altitude;
}
