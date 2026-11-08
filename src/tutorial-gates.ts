import { ringRow, ROW_ALTITUDE, RING_RADIUS } from './ring-layout.ts';

/** Practice target gates: the lesson is "drive through the marked gate", judged on the engine's own ring hit. */
export type GateStep = 'left' | 'right' | 'brake';
export type GateResult = 'pass' | 'missed' | 'noBrake';
export interface GateRing {
  distance: number; x: number; altitude: number; radius: number; type: string;
  group: number; groupSize: number; row?: boolean; hit?: boolean;
}
export const isGateStep = (step: string | null | undefined): step is GateStep =>
  step === 'left' || step === 'right' || step === 'brake';
// At least 110 m and ~2.4 s ahead at the car's own speed: time to read the cue,
// well inside the 900 m ring draw window even at top speed.
export const GATE_AHEAD = 110;
const GATE_SECONDS = 2.4;
// Lane gates sit on the outer lane: the car has to steer past x = ±3.4 to pass one.
const LANE_X: Record<'left' | 'right', number> = { left: -7.5, right: 7.5 };
// Existing ring colours: cyan lanes, red brake row.
const GATE_TYPE: Record<GateStep, string> = { left: 'charge', right: 'charge', brake: 'risk' };
// Boost lesson (user, 2026-11-08): a marked stretch of blue charge-ring rows, cleared in time only by boosting.
// The purple slipstream row it replaced granted a 3 s mini boost that dashed the car forward on its own.
export const BOOST_STRETCH = 700; // m
const BOOST_ROW_EVERY = 70; // m: 11 rows × 4 rings = 44, inside the 48-ring pool of one colour (effects.js)
// From the start line at 88 m/s: throttle alone takes ~7.95 s, BOOST held (cap 102 m/s) ~6.9 s.
export const BOOST_LIMIT = 7.4; // s

const practiceRings = (rings: readonly Omit<GateRing, 'group' | 'groupSize'>[]): GateRing[] =>
  // Full radius even for the red row (risk rings are half size); groupSize Infinity: a practice gate
  // never completes a PERFECT LINE (no bonus score or NITRO).
  rings.map(ring => ({ ...ring, radius: RING_RADIUS, group: -1, groupSize: Infinity }));
const gateAt = (carDistance: number, carSpeed: number): number => carDistance + Math.max(GATE_AHEAD, carSpeed * GATE_SECONDS);

export function placeGate(step: GateStep, carDistance: number, carSpeed = 0): GateRing[] {
  const at = gateAt(carDistance, carSpeed), type = GATE_TYPE[step];
  return practiceRings(step === 'left' || step === 'right'
    ? [{ distance: at, x: LANE_X[step], altitude: ROW_ALTITUDE, radius: RING_RADIUS, type }]
    : ringRow(at, type));
}
export function placeBoostStretch(carDistance: number, carSpeed = 0): GateRing[] {
  const start = gateAt(carDistance, carSpeed), rows: ReturnType<typeof ringRow> = [];
  for (let d = 0; d <= BOOST_STRETCH; d += BOOST_ROW_EVERY) rows.push(...ringRow(start + d, 'charge'));
  return practiceRings(rows);
}
export function judgeGate(step: GateStep, rings: readonly GateRing[], car: { braking: boolean }): GateResult {
  if (!rings.some(ring => ring.hit)) return 'missed';
  if (step === 'brake' && !car.braking) return 'noBrake';
  return 'pass';
}
/** HUD arrow toward the gate; rows span the road, so they only ever point ahead. */
export function gateGuide(rings: readonly GateRing[], carX: number): 'left' | 'right' | 'ahead' {
  if (rings.length !== 1) return 'ahead';
  const dx = rings[0]!.x - carX;
  return dx < -4 ? 'left' : dx > 4 ? 'right' : 'ahead';
}
