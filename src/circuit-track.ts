import type { TrackConfig } from './game-types.ts';
import type { Vec3 } from './sky-track.ts';

export const CIRCUIT_ID = 'harbor-circuit';
export const CIRCUIT_LENGTH = 2000;
export const CIRCUIT_RADIUS = CIRCUIT_LENGTH / (2 * Math.PI);
export const CIRCUIT_HALF_WIDTH = 12;
export const CIRCUIT_BEACON = Object.freeze({ at: 240, offset: 120, scale: 2.5 });
export const CIRCUIT_TRACK: TrackConfig & { topology: 'circuit'; topologyVersion: 1 } = {
  name: 'Harbor Circuit', length: CIRCUIT_LENGTH, trafficDensity: 0, seed: 11011,
  sections: [], topology: 'circuit', topologyVersion: 1,
};
export const circuitDistance = (distance: number): number => Number.isFinite(distance) ? ((distance % CIRCUIT_LENGTH) + CIRCUIT_LENGTH) % CIRCUIT_LENGTH : 0;
// Signed physical separation, independent of lap count; standings keep unwrapped distance.
export function physicalGap(trackId: string, from: number, to: number): number {
  const gap = to - from;
  return trackId === CIRCUIT_ID ? circuitDistance(gap + CIRCUIT_LENGTH / 2) - CIRCUIT_LENGTH / 2 : gap;
}
export function circuitFrame(distance: number) {
  const angle = circuitDistance(distance) / CIRCUIT_RADIUS;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  return {
    point: { x: CIRCUIT_RADIUS * (1 - cos), y: 0, z: -CIRCUIT_RADIUS * sin },
    forward: [sin, 0, -cos] as Vec3,
    right: [cos, 0, sin] as Vec3,
    up: [0, 1, 0] as Vec3,
  };
}

export function circuitLaps(config: unknown): number | null {
  if (!config || typeof config !== 'object') return null;
  const rules = config as Record<string, unknown>;
  return rules.mode === 'circuit' && rules.topologyVersion === 1 && [1, 3, 5].includes(rules.laps as number) ? rules.laps as number : null;
}
