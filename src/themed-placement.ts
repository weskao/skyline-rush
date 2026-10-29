// Authoring helpers for 11B themed hazard tables; every result is checked by validateHazardPlacement.
import type { GameplayType } from './object-catalog.ts';

export const place = (trackId: string, id: string, type: GameplayType, distance: number, lateralOffset: number) => ({
  id, trackId, type, distance, lateralOffset, altitude: 0,
  triggerWindow: { from: distance - 60, to: distance + 20 }, warningLeadSeconds: 1.5,
  movementPattern: { kind: 'static' }, difficulty: 'standard', seed: Math.round(distance),
});
// A shoulder closure: a row of cones along one outer lane, so the other three stay open.
export const closure = (trackId: string, name: string, from: number, lane: number, count = 6) =>
  Array.from({ length: count }, (_, i) => place(trackId, `${name}-${i + 1}`, 'cone', from + i * 12, lane));
