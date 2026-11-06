import { ringRow, ROW_ALTITUDE, RING_RADIUS } from './ring-layout.ts';

/** Practice target gates: the lesson is "drive through the marked gate", judged on the engine's own ring hit. */
export type GateStep = 'left' | 'right' | 'brake' | 'boost';
export type GateResult = 'pass' | 'missed' | 'noBrake' | 'noBoost';
export interface GateRing {
  distance: number; x: number; altitude: number; radius: number; type: string;
  group: number; groupSize: number; row?: boolean; hit?: boolean;
}
export const isGateStep = (step: string | null | undefined): step is GateStep =>
  step === 'left' || step === 'right' || step === 'brake' || step === 'boost';
// At least 110 m and ~2.4 s ahead at the car's own speed: time to read the cue,
// well inside the 900 m ring draw window even at top speed.
export const GATE_AHEAD = 110;
const GATE_SECONDS = 2.4;
// Lane gates sit on the outer lane: the car has to steer past x = ±3.4 to pass one.
const LANE_X: Record<'left' | 'right', number> = { left: -7.5, right: 7.5 };
// Existing ring colours: cyan lanes, red brake row, purple boost row.
const GATE_TYPE: Record<GateStep, string> = { left: 'charge', right: 'charge', brake: 'risk', boost: 'slipstream' };

export function placeGate(step: GateStep, carDistance: number, carSpeed = 0): GateRing[] {
  const at = carDistance + Math.max(GATE_AHEAD, carSpeed * GATE_SECONDS), type = GATE_TYPE[step];
  const rings = step === 'left' || step === 'right'
    ? [{ distance: at, x: LANE_X[step], altitude: ROW_ALTITUDE, radius: RING_RADIUS, type }]
    : ringRow(at, type);
  // Full radius even for the red row (risk rings are half size); groupSize Infinity: a practice gate
  // never completes a PERFECT LINE (no bonus score or NITRO).
  return rings.map(ring => ({ ...ring, radius: RING_RADIUS, group: -1, groupSize: Infinity }));
}
export function judgeGate(step: GateStep, rings: readonly GateRing[], car: { braking: boolean; boosting: boolean }): GateResult {
  if (!rings.some(ring => ring.hit)) return 'missed';
  if (step === 'brake' && !car.braking) return 'noBrake';
  if (step === 'boost' && !car.boosting) return 'noBoost';
  return 'pass';
}
/** HUD arrow toward the gate; rows span the road, so they only ever point ahead. */
export function gateGuide(rings: readonly GateRing[], carX: number): 'left' | 'right' | 'ahead' {
  if (rings.length !== 1) return 'ahead';
  const dx = rings[0]!.x - carX;
  return dx < -4 ? 'left' : dx > 4 ? 'right' : 'ahead';
}
