// Per-tier drift "charge" on the car body (drift-charge-vfx.js draws it): which tier fired, how the light sweeps,
// glows and the body hops over time, and the size of it all from the measured body. Pure, so it is unit-tested.
// Deliberately unlike the rear-exhaust NITRO/BOOST flames: light runs from the rear wheels forward over the shell.
import type { Box3 } from 'three';
import { driftTier } from './drive-rules.ts';

/** The tier a drift held `time` s just reached (1-3), or 0 when it reached none since `last`. */
export const chargeFired = (last: number, time: number): number => {
  const tier = driftTier(time);
  return tier > last ? tier : 0;
};

// Seconds and fractions of the body: sweeps = how many bands run rear→nose, hop = body lift as a share of the fitted hop.
export const CHARGE_LOOKS = {
  1: { duration: 0.45, sweeps: 1, sweepTime: 0.3, gap: 0, sharp: 34, hold: 0.12, fade: 0.33, peak: 0.55, hop: 0.6, hopTime: 0.24 },
  2: { duration: 0.6, sweeps: 2, sweepTime: 0.28, gap: 0.14, sharp: 26, hold: 0.3, fade: 0.25, peak: 1, hop: 0.8, hopTime: 0.26 },
  3: { duration: 0.9, sweeps: 2, sweepTime: 0.22, gap: 0.1, sharp: 18, hold: 0.5, fade: 0.4, peak: 1, hop: 1, hopTime: 0.4 },
} as const;
type Tier = keyof typeof CHARGE_LOOKS;

export interface ChargeFrame {
  active: boolean;
  /** Each band's position along the body, 0 = tail, 1 = nose; negative = not running. */
  fronts: [number, number];
  sharp: number;
  glow: number;
  flash: number;
  /** Shockwave radius progress 0-1 (0 = none); its opacity is (1 - ring)². */
  ring: number;
  /** Body offset as a share of the fitted hop: tier 1/2 hop up, tier 3 dips then rebounds. */
  bounce: number;
}

const OFF = -1;
const sweepAt = (age: number, start: number, length: number): number =>
  age < start || age > start + length ? OFF : (age - start) / length * 1.3 - 0.15; // starts behind the tail, leaves past the nose

/** Writes the look `age` s after `tier` fired into `out` (caller-owned, so nothing is allocated per frame). */
export function chargeFrame(tier: number, age: number, out: Partial<ChargeFrame>): ChargeFrame {
  const frame = out as ChargeFrame;
  frame.fronts ??= [OFF, OFF];
  const look = CHARGE_LOOKS[tier as Tier];
  frame.active = !!look && age >= 0 && age < look.duration;
  if (!frame.active) {
    frame.fronts[0] = frame.fronts[1] = OFF;
    frame.sharp = 1; frame.glow = frame.flash = frame.ring = frame.bounce = 0;
    return frame;
  }
  frame.sharp = look.sharp;
  frame.fronts[0] = sweepAt(age, 0, look.sweepTime);
  frame.fronts[1] = look.sweeps > 1 ? sweepAt(age, look.gap, look.sweepTime) : OFF;
  const rise = Math.min(1, age / 0.06), fade = 1 - Math.min(1, Math.max(0, age - look.hold) / look.fade);
  frame.glow = look.peak * rise * fade;
  frame.flash = tier === 3 ? Math.max(0, 1 - age / 0.35) ** 2 : 0;
  frame.ring = tier === 3 && age < 0.55 ? Math.max(1e-3, age / 0.55) : 0;
  const t = age / look.hopTime;
  frame.bounce = t >= 1 ? 0 : tier === 3
    ? -Math.sin(t * Math.PI * 2) * (t < 0.5 ? 0.8 : 1) * look.hop // dip, then a slightly bigger rebound
    : Math.sin(t * Math.PI) * look.hop;
  return frame;
}

export interface ChargeFit { x: number; z: number; ringRadius: number; hop: number }

/** Ground-ring centre/radius and hop height (car units) from the body's car-local bounds. No per-car constants. */
export function chargeFit({ min, max }: Box3): ChargeFit {
  const width = max.x - min.x, length = max.z - min.z, height = max.y - min.y;
  if (!(width > 0 && length > 0 && height > 0)) return { x: 0, z: 0, ringRadius: 0, hop: 0 };
  return { x: (min.x + max.x) / 2, z: (min.z + max.z) / 2, ringRadius: Math.hypot(width, length) * 0.5, hop: height * 0.04 };
}
