// Authoring helpers for 11B themed hazard tables; every result is checked by validateHazardPlacement.
import type { GameplayType } from './object-catalog.ts';

export const place = (trackId: string, id: string, type: GameplayType, distance: number, lateralOffset: number, extra: object = {}) => ({
  id, trackId, type, distance, lateralOffset, altitude: 0,
  triggerWindow: { from: distance - 60, to: distance + 20 }, warningLeadSeconds: 1.5,
  movementPattern: { kind: 'static' }, difficulty: 'standard', seed: Math.round(distance), ...extra,
});
// Motion presets (ENV-04 hazardFrame): a gate swinging between two lanes (place it at ±4.6), a barrier switching on and off, a rock dropping onto the road.
export const sweep = (period: number, phase = 0) => ({ movementPattern: { kind: 'sweep', amplitude: 1.8, period, phase } });
export const pulse = (period: number, phase = 0) => ({ movementPattern: { kind: 'pulse', period, phase } });
// A light hoop hanging over the road that turns once per period (ENV-04 'rotate'); it is collected, never solid.
export const hoop = (altitude: number, period: number, phase = 0) => ({ altitude, movementPattern: { kind: 'rotate', period, phase } });
export const fall = (from: number, period: number, phase = 0) => ({ altitude: from, movementPattern: { kind: 'fall', period, phase } });
// A shoulder closure: a row of cones along one outer lane, so the other three stay open.
export const closure = (trackId: string, name: string, from: number, lane: number, count = 6) =>
  Array.from({ length: count }, (_, i) => place(trackId, `${name}-${i + 1}`, 'cone', from + i * 12, lane));
