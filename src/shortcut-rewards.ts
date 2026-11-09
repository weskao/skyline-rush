// Authored rewards on shortcuts: distinct CourseGraph edges retain a 25 m mix. The 1D mapped
// corridors share the main road's view, so use 50 m to avoid visually flooding ordinary lanes.
// Both preserve the 60 m cell line and halfway tank; neither uses the layout seed.
import type { CourseItem } from './course-items.ts';
import { RING_RADIUS } from './ring-layout.ts';

export const SHORTCUT_BURST_STEP = 25;
export const MAPPED_SHORTCUT_BURST_STEP = 50;
export const SHORTCUT_BURST_OFFSET = 12;
const BURST_TYPES = ['charge', 'slipstream', 'charge', 'nitro', 'slipstream', 'charge'] as const;
const BURST_GROUP = -4; // groupSize Infinity: these rings never complete a PERFECT LINE

interface ShortcutSection { type?: string; from?: number; to?: number; x?: number; altitude?: number }

export function burstStations(start: number, end: number, step = SHORTCUT_BURST_STEP): { rings: number[]; cells: number[] } {
  const rings: number[] = [], cells: number[] = [];
  for (let s = start; s < end; s += step) rings.push(s);
  for (let s = start + SHORTCUT_BURST_OFFSET; s < end; s += step) cells.push(s);
  return { rings, cells };
}

export function burstRing(distance: number, x: number, altitude: number, index: number) {
  return {
    distance, x, altitude, radius: RING_RADIUS,
    type: BURST_TYPES[index % BURST_TYPES.length],
    group: BURST_GROUP, groupSize: Infinity,
  };
}

/** Course-graph sections. The caller only invokes this for `topology: 'course-graph'`. */
export function placeSectionBurst(rings: CourseItem[], pickups: CourseItem[], sections: readonly unknown[]): void {
  let added = false;
  for (const section of sections) {
    const corridor = section as ShortcutSection;
    if (corridor?.type !== 'shortcut' || typeof corridor.from !== 'number' || typeof corridor.to !== 'number') continue;
    const x = corridor.x ?? 0, altitude = corridor.altitude ?? 0;
    const { rings: ringAt, cells } = burstStations(corridor.from + 30, corridor.to, MAPPED_SHORTCUT_BURST_STEP);
    for (let i = 0; i < ringAt.length; i++) rings.push(burstRing(ringAt[i]!, x, altitude, i));
    for (const distance of cells) pickups.push({ distance, x, altitude, tier: 'cell' });
    added = added || ringAt.length + cells.length > 0;
  }
  if (!added) return;
  rings.sort((a, b) => a.distance - b.distance);
  pickups.sort((a, b) => a.distance - b.distance);
}
