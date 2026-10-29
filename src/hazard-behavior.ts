// ENV-04: what a hazard is doing at a given race time, and what it does to a
// car it touches. Pure and deterministic: the same placement and time always
// give the same frame, so replays, ghosts and every device agree.
import { OBJECT_CATALOG, type GameplayEffect } from './object-catalog.ts';
import { hazardBox, HAZARD_LIMITS, type HazardPlacement } from './hazard-schema.ts';

export interface HazardFrame { readonly active: boolean; readonly lateralOffset: number; readonly altitude: number; readonly angle: number }
export interface CarProbe { readonly distance: number; readonly x: number; readonly altitude: number }

// Matches game.js reach: |car.x - barrier.x| < 1.8 for a 1.55 m half-width barrier, ±2.2 m along the road.
// Narrower than the drawn 0.85 m car, so near touches forgive every input alike: the simulation never reads the device.
export const CAR_PROBE = Object.freeze({ halfWidth: 0.25, halfLength: 2.2, height: 1.2 });
const FALL_SHARE = 0.4; // debris spends 40% of its cycle falling, then rests on the road

export function hazardFrame(p: HazardPlacement, time: number): HazardFrame {
  const move = p.movementPattern;
  const base = { active: true, lateralOffset: p.lateralOffset, altitude: p.altitude, angle: 0 };
  if (move.kind === 'static') return base;
  const t = Number.isFinite(time) ? time : 0; // fail safely on corrupt external timestamps
  const cycle = ((t % move.period) + move.period) % move.period / move.period + move.phase / (2 * Math.PI);
  const u = cycle - Math.floor(cycle), turn = u * 2 * Math.PI;
  const max = HAZARD_LIMITS.maxLateral;
  if (move.kind === 'sweep') return { ...base, lateralOffset: Math.max(-max, Math.min(max, p.lateralOffset + Math.sin(turn) * move.amplitude)) };
  if (move.kind === 'pulse') return { ...base, active: u < 0.5 };
  if (move.kind === 'rotate') return { ...base, angle: turn };
  return { ...base, altitude: p.altitude * Math.max(0, 1 - u / FALL_SHARE) };
}

/** The effect a touching car receives, or null when the car is clear or the hazard is switched off. */
export function hazardContact(p: HazardPlacement, frame: HazardFrame, car: CarProbe): GameplayEffect | null {
  if (!frame.active) return null;
  const box = hazardBox({ ...p, lateralOffset: frame.lateralOffset, altitude: frame.altitude });
  const clear = car.distance + CAR_PROBE.halfLength < box.from || car.distance - CAR_PROBE.halfLength > box.to ||
    car.x + CAR_PROBE.halfWidth < box.left || car.x - CAR_PROBE.halfWidth > box.right ||
    car.altitude + CAR_PROBE.height < box.bottom || car.altitude >= box.top;
  return clear ? null : OBJECT_CATALOG[p.type].effect;
}
