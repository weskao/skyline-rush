import { physicalGap } from './circuit-track.ts';

// The one set of speed and fuel rules every racer drives by: the player (game.js) and the rivals
// (rival-driver.ts) read the same numbers, so a rival can never out-accelerate or out-run the player's car.
export const MAX_SPEED = 88; // m/s on the throttle alone
export const BOOST_CAP_BONUS = 14; // m/s added to the cap while BOOST (or a mini boost) runs
export const NITRO_CAP_BONUS = 30; // m/s added to the cap during NITRO
export const THROTTLE_ACCEL = 15; // m/s²
export const BOOST_ACCEL = 12; // m/s² on top of the throttle
export const NITRO_ACCEL = 40; // m/s² on top of the throttle
export const OVER_CAP_DECEL = 18; // m/s² shed while above the current cap
export const NITRO_TIME = 2.5; // seconds one charge lasts
export const FLY_DRAIN = 15; // fuel/s while thrusting (Phase 1: more room to fly while preserving ground recharge)
export const BOOST_DRAIN = 10; // fuel/s while boosting on the road
export const GROUND_FUEL_REGEN = 13; // fuel/s on the road with FLY and BOOST released
export const UPHILL_FUEL_REGEN = 6.5; // fuel/s on an uphill section
export const GLIDE_FUEL_REGEN = 4; // fuel/s while airborne with FLY and boost released

// DRIFT: brake + steer on the ground at speed; tuning in docs/superpowers/specs/2026-11-13-drift-balance-design.md.
export const DRIFT_MIN_SPEED = 45; // m/s needed to start or hold a drift
export const DRIFT_BLEED = 1.5; // m/s^2 lost while drifting (normal braking is 35)
// Payout on release for the highest threshold reached: seconds drifted, nitro charges, mini-boost seconds.
export const DRIFT_REWARDS = [{ time: 2, nitro: 0.7, boost: 1.6 }, { time: 1.2, nitro: 0.45, boost: 1.1 }, { time: 0.6, nitro: 0.25, boost: 0.7 }] as const;
/** Reward tiers (0-3) a drift held `time` seconds has reached; read per frame, so it allocates nothing. */
export const driftTier = (time: number): number => DRIFT_REWARDS.reduce((tier, reward) => tier + Number(time >= reward.time), 0);

// SLIPSTREAM: right behind a rival or traffic car (same lane, in draft range) long enough pays once per engagement.
export const SLIPSTREAM_TIME = 1.5; // seconds in the draft before it pays
export const SLIPSTREAM_CAP_BONUS = 6; // m/s added to the speed cap while the draft is active
export const SLIPSTREAM_NITRO = 0.25; // charges, once per engagement (leave the draft to re-arm)
export const SLIPSTREAM_LATERAL = 1.9; // m, max sideways offset from the car ahead
export const SLIPSTREAM_MIN_GAP = 4.4; // m behind; closer is a collision
export const SLIPSTREAM_MAX_GAP = 14; // m behind
export const SLIPSTREAM_ALTITUDE = 1.8; // m, max altitude difference
interface DraftCar { distance: number; x: number; altitude?: number }
export interface Slipstream { time: number; active: boolean; paid: boolean }
export const inDraft = (trackId: string, car: DraftCar, other: DraftCar): boolean => {
  const gap = physicalGap(trackId, car.distance, other.distance);
  return gap >= SLIPSTREAM_MIN_GAP && gap <= SLIPSTREAM_MAX_GAP && Math.abs(other.x - car.x) < SLIPSTREAM_LATERAL &&
    Math.abs((other.altitude || 0) - (car.altitude || 0)) < SLIPSTREAM_ALTITUDE;
};
/** One step of the draft timer, judged on last step's positions; true on the step it pays SLIPSTREAM_NITRO. */
export function stepSlipstream(slip: Slipstream, drafted: boolean, dt: number): boolean {
  slip.time = drafted ? slip.time + dt : 0;
  slip.active = drafted && slip.time >= SLIPSTREAM_TIME;
  if (!drafted) slip.paid = false;
  else if (slip.active && !slip.paid) return (slip.paid = true);
  return false;
}
