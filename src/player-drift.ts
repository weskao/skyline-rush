import { DRIFT_MIN_SPEED, DRIFT_FLIP_GRACE, DRIFT_REWARDS, driftCredit, driftTier, grantMiniBoost } from './drive-rules.ts';

interface Drift {
  time: number;
  dir: number;
  nitro: number;
  grace: number;
}

export interface DriftHold { reward: Drift | null }

interface DriftPlayer {
  speed: number;
  altitude: number;
  railContactSide: number;
  drift: Drift | null;
  driftHold: DriftHold | null;
  driftPayout: { time: number; nitro: number } | null;
  miniBoost: number;
  miniBoostEvent: unknown;
}

/** Step the drift and return newly earned NITRO. Only releasing the input pays the mini boost. */
export function stepPlayerDrift(car: DriftPlayer, brake: boolean, steer: number, dt: number, elapsed: number): number {
  const canDrift = brake && car.altitude === 0 && car.speed >= DRIFT_MIN_SPEED;
  const dir = Math.sign(steer);
  if (canDrift && dir !== 0 && car.railContactSide !== dir && (!car.driftHold || car.drift)) {
    car.driftHold ??= { reward: null };
    const drift = car.drift ??= { time: 0, dir, nitro: 0, grace: 0 };
    drift.dir = dir;
    drift.grace = 0;
    drift.time += dt;
    return driftCredit(drift);
  }

  const hold = car.driftHold;
  if (car.drift) {
    if (canDrift && dir === 0 && (car.drift.grace += dt) <= DRIFT_FLIP_GRACE) return 0;
    if (hold && car.drift.nitro > 0) hold.reward = car.drift;
    car.drift = null;
  }

  // The rest of this hold coasts. The next press can brake or start another drift.
  if (brake || !hold) return 0;
  car.driftHold = null;
  const earned = hold.reward;
  if (!earned) return 0;
  const reward = DRIFT_REWARDS.find(tier => earned.time >= tier.time);
  if (reward) {
    grantMiniBoost(car, reward.boost, elapsed, driftTier(earned.time));
    car.driftPayout = { time: elapsed, nitro: earned.nitro };
  }
  return 0;
}
