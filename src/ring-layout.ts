import { seededRng, RACE_STREAMS } from './rng.ts';
import type { TrackConfig } from './game-types.ts';

export const RING_RADIUS = 4.8;
export const RISK_RING_RADIUS = 2.4;
export const RING_SPACING = 220;
const RING_GAP: readonly [number, number] = [200, 320]; // scattered rings: metres to the next ring
// Cumulative roll thresholds for charge / nitro / slipstream / risk; the rest is mystery.
const RING_ODDS: readonly [number, number, number, number] = [0.35, 0.6, 0.78, 0.9];
export const RING_FUEL = 20; // charge ring
export const SLIPSTREAM_BOOST = 3; // seconds, burns no fuel (shares the mini-boost)
export { RISK_SCORE } from './risk-lines.ts';
export const PERFECT_LINE_NITRO = 1;
export const MYSTERY_EFFECTS = ['shield', 'magnet', 'ghost', 'freeze'];
export const EFFECT_TIMES = { shield: 10, magnet: 5, ghost: 3, freeze: 2 }; // seconds; shield also ends on the first absorbed hit

export interface RaceRing { distance: number; x: number; altitude: number; radius: number; type: string; group: number; hit?: boolean }

// Rings come only from the track's 'rings' stream. Coast keeps its original gate grid (x 2.5, altitude 8);
// other tracks scatter them. Rings are consecutive groups of 3-5 (the last group absorbs the remainder).
// Optional per-track ringGap / ringOdds / ringAltitudes tune one track; omitted, the defaults keep every layout bit-for-bit.
export function createRings(track: TrackConfig, riskLines = true): RaceRing[] {
  const random = seededRng(track.seed, RACE_STREAMS.rings);
  const [gapMin, gapMax] = track.ringGap ?? RING_GAP, [charge, nitro, slip, risk] = track.ringOdds ?? RING_ODDS;
  const rings: RaceRing[] = [];
  const inTunnel = (distance: number) => track.sections.some(s => s.type === 'tunnel' && distance >= s.from && distance < s.to);
  for (let distance = RING_SPACING; distance < track.length - 100;) {
    const roll = random();
    let type = roll < charge ? 'charge' : roll < nitro ? 'nitro' : roll < slip ? 'slipstream' : roll < risk ? (riskLines ? 'risk' : 'nitro') : 'mystery'; // same roll either way: layout unchanged
    let x = 2.5;
    let altitude = track.ringAltitudes?.[rings.length % track.ringAltitudes.length] ?? 8;
    if (!track.fixedRings) {
      x = Math.round((random() * 2 - 1) * 70) / 10;
      altitude = type === 'risk' ? 10 : Math.round((3 + random() * 6) * 10) / 10;
    }
    if (inTunnel(distance)) { // the car cannot climb in a tunnel, so a 'risk' ring there would be free
      altitude = 1.5;
      if (type === 'risk') type = 'nitro';
    }
    rings.push({ distance, x, altitude, radius: type === 'risk' ? RISK_RING_RADIUS : RING_RADIUS, type, group: 0 });
    distance += track.fixedRings ? track.ringGap?.[0] ?? RING_SPACING : Math.round(gapMin + random() * (gapMax - gapMin));
  }
  for (let i = 0, group = 0; i < rings.length; group++) {
    const left = rings.length - i;
    let size = 3 + Math.floor(random() * 3);
    if (left - size < 3) size = left <= 5 ? left : left - 3;
    for (let j = i; j < i + size; j++) rings[j].group = group;
    i += size;
  }
  return rings;
}
