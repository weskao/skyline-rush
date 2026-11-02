import { seededRng, RACE_STREAMS } from './rng.ts';
import type { TrackConfig } from './game-types.ts';

export const RING_RADIUS = 4.8;
export const RISK_RING_RADIUS = 2.4;
const RING_START = 110; // m: the first ring is never on the starting grid
// Cumulative roll thresholds for charge / nitro / slipstream / risk; the rest is mystery.
const RING_ODDS: readonly [number, number, number, number] = [0.35, 0.6, 0.78, 0.9];
// User, 2026-11-02: rings and pickups each scale with the grid, this many single ones per car (per lap in Circuit).
export const ITEMS_PER_CAR = 4;
const LOW_ALTITUDE = 1.5; // under a tunnel roof
export const NITRO_MAX = 3; // charges
export const NITRO_PICKUPS: Readonly<Record<string, number>> = { cell: 0.25, can: 0.5, tank: 1, overcharge: NITRO_MAX }; // overcharge only tops up to the cap, no fuel
export const RING_NITRO: Readonly<Record<string, number>> = { nitro: 0.5, risk: 1 }; // charge each NITRO-paying ring type grants
export const RING_FUEL = 20; // charge ring
export const SLIPSTREAM_BOOST = 3; // seconds, burns no fuel (shares the mini-boost)
export { RISK_SCORE } from './risk-lines.ts';
export const PERFECT_LINE_NITRO = 1;
export const MYSTERY_EFFECTS = ['shield', 'magnet', 'ghost', 'freeze'];
export const EFFECT_TIMES = { shield: 10, magnet: 5, ghost: 3, freeze: 2 }; // seconds; shield also ends on the first absorbed hit

export interface RaceRing {
  distance: number; x: number; altitude: number; radius: number; type: string; group: number; hit?: boolean;
  /** Rings in this ring's PERFECT LINE group. */
  groupSize?: number;
  /** Race time until which the ring is gone after a car took it (stage 2 respawn). */
  downUntil?: number;
}

const ring = (distance: number, x: number, altitude: number, type: string): RaceRing =>
  ({ distance, x, altitude, radius: type === 'risk' ? RISK_RING_RADIUS : RING_RADIUS, type, group: 0 });

// Consecutive groups of 3-5 rings (the last group absorbs the remainder; fewer than 3 make one group).
function assignGroups(rings: RaceRing[], random: () => number): void {
  let group = 0;
  for (let i = 0; i < rings.length; group++) {
    const left = rings.length - i;
    let size = 3 + Math.floor(random() * 3);
    if (left - size < 3) size = left <= 5 ? left : left - 3;
    for (const r of rings.slice(i, i + size)) Object.assign(r, { group, groupSize: size });
    i += size;
  }
}

/** `count` random distances, one per equal slice of [from, to): re-rolled per seed, yet spread over the whole track. */
export function spreadDistances(count: number, from: number, to: number, random: () => number): number[] {
  const slice = (to - from) / count;
  return Array.from({ length: count }, (_, i) => Math.round(from + (i + random()) * slice));
}

// `count` single rings from the 'rings' stream of `seed` (the track seed unless a race re-rolls it). Coast keeps its
// gate line (x 2.5, altitudes from ringAltitudes); other tracks scatter x and altitude. Optional per-track ringOdds /
// openingNitroRings tune one track.
export function createRings(track: TrackConfig, riskLines = true, count = ITEMS_PER_CAR, seed = track.seed): RaceRing[] {
  const random = seededRng(seed, RACE_STREAMS.rings);
  const [charge, nitro, slip, risk] = track.ringOdds ?? RING_ODDS;
  const inTunnel = (distance: number) => track.sections.some(s => s.type === 'tunnel' && distance >= s.from && distance < s.to);
  const rings = spreadDistances(count, RING_START, track.length - 100, random).map((distance, slot) => {
    const roll = random();
    let type = roll < charge ? 'charge' : roll < nitro ? 'nitro' : roll < slip ? 'slipstream' : roll < risk ? 'risk' : 'mystery';
    let x = 2.5;
    let altitude = track.ringAltitudes?.[slot % track.ringAltitudes.length] ?? 8;
    if (!track.fixedRings) {
      x = Math.round((random() * 2 - 1) * 70) / 10;
      altitude = type === 'risk' ? 10 : Math.round((3 + random() * 6) * 10) / 10;
    }
    if (slot < (track.openingNitroRings ?? 0)) type = 'nitro'; // after the rolls: the stream and positions stay the same
    if (inTunnel(distance)) { // the car cannot climb in a tunnel, so a 'risk' ring there would be free
      altitude = LOW_ALTITUDE;
      if (type === 'risk') type = 'nitro';
    }
    if (!riskLines && type === 'risk') type = 'nitro'; // risk lines off: same layout, nitro rings
    return ring(distance, x, altitude, type);
  });
  assignGroups(rings, random);
  return rings;
}
