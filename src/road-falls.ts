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

export interface FallingCar {
  distance: number; x: number; altitude: number; verticalSpeed: number; speed: number; cooldown: number; combo: number;
  drift: unknown; trick: unknown; poweredFlightTime: number; flightBoosted: boolean; falls: number;
  fall: { from: number; distance: number; time: number } | null; span?: boolean;
}

/** Puts a fallen car back on the road at `distance`: slowed, grounded, with respawn grace. */
export function dropCar(car: FallingCar, distance: number, from: number, time: number, slowdown: number): void {
  car.speed *= slowdown;
  car.distance = distance;
  car.altitude = car.verticalSpeed = 0;
  car.cooldown = 1.5; // respawn grace: no instant collision with traffic parked at the respawn
  car.combo = 0;
  car.drift = null;
  car.trick = null;
  car.poweredFlightTime = 0;
  car.flightBoosted = false;
  car.span = false;
  car.falls++;
  car.fall = { from, distance, time };
}

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
  else if (car.span && !over) dropCar(car, section.from, section.from, time, slowdown);
  else if (over && car.altitude < (section.altitude ?? 0) + SHORTCUT_TOLERANCE) car.span = true;
}

const CAR_HALF_WIDTH = .85; // m: half the car-vs-car box (|Δx| < 1.7)
/**
 * Solid deck (`section.deck`): a car body never sits inside the slab. Whichever side the car came from wins:
 * from below its roof stops at the underside, from above it rests on the top and drops off past the end or a side.
 */
export function stepDeck(car: FallingCar, section: TrackSection | undefined, previousAltitude: number, carHeight: number): void {
  if (!section?.deck || car.distance >= section.to || Math.abs(car.x - (section.x ?? 0)) >= SHORTCUT_HALF_WIDTH + CAR_HALF_WIDTH) return;
  const top = (section.altitude ?? 0) - SHORTCUT_TOLERANCE, under = top - DECK_DEPTH;
  if (car.altitude + carHeight <= under || car.altitude >= top) return;
  if (previousAltitude + carHeight / 2 < (top + under) / 2) { car.altitude = under - carHeight; car.verticalSpeed = Math.min(0, car.verticalSpeed); }
  else { car.altitude = top; car.verticalSpeed = Math.max(0, car.verticalSpeed); }
}
