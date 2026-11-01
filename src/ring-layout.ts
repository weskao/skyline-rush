import { seededRng, RACE_STREAMS } from './rng.ts';
import type { TrackConfig } from './game-types.ts';

export const RING_RADIUS = 4.8;
export const RISK_RING_RADIUS = 2.4;
export const RING_SPACING = 220;
const RING_GAP: readonly [number, number] = [200, 320]; // scattered rings: metres to the next ring
// Cumulative roll thresholds for charge / nitro / slipstream / risk; the rest is mystery.
const RING_ODDS: readonly [number, number, number, number] = [0.35, 0.6, 0.78, 0.9];
// Stage 2 (user, 2026-11-02): about twice the rings and pickups on every track, so rivals collecting too never thin the player's share.
export const RING_GAP_SCALE = 0.5;
export const PICKUP_GAP_SCALE = 0.45;
// Full-width rows and dense trains, per ring slot; a track's ringRows / ringTrains override them.
const ROW_ODDS = 0.1, TRAIN_ODDS = 0.06;
const ROW_LANES = [-7.5, -2.5, 2.5, 7.5]; // game.js LANES (this module sits below game.js); tests/ring-density.test.js keeps them equal
export const ROW_ALTITUDE = 2.5; // lanes 5 m apart, radius 4.8: a car anywhere on the road, or up to ~6 m over it, passes one
export const TRAIN_LENGTH = 5;
export const TRAIN_SPACING = 25; // m between the rings of a dense train
const LOW_ALTITUDE = 1.5; // under a tunnel roof
export const RING_FUEL = 20; // charge ring
export const SLIPSTREAM_BOOST = 3; // seconds, burns no fuel (shares the mini-boost)
export { RISK_SCORE } from './risk-lines.ts';
export const PERFECT_LINE_NITRO = 1;
export const MYSTERY_EFFECTS = ['shield', 'magnet', 'ghost', 'freeze'];
export const EFFECT_TIMES = { shield: 10, magnet: 5, ghost: 3, freeze: 2 }; // seconds; shield also ends on the first absorbed hit

export interface RaceRing {
  distance: number; x: number; altitude: number; radius: number; type: string; group: number; hit?: boolean;
  /** Full-width row id: every ring of the row is one gate, and taking any of them passes it. */
  row?: number;
  /** Part of a dense train: its own PERFECT LINE group, every ring a gate. */
  train?: boolean;
  /** Gates in this ring's group (a row counts once). */
  groupSize?: number;
}

/** Whether [distance - before, distance + after] touches a section of this type. */
type Within = (distance: number, type: string, before?: number, after?: number) => boolean;
const ring = (distance: number, x: number, altitude: number, type: string): RaceRing =>
  ({ distance, x, altitude, radius: type === 'risk' ? RISK_RING_RADIUS : RING_RADIUS, type, group: 0 });

// One ring slot becomes a single ring, a full-width row or a dense train. A risk slot stays a single narrow
// risk ring: risk lines keep their frequency, and a guaranteed ring is never a risk ring.
function placeSlot(rings: RaceRing[], shape: number, odds: { row: number; train: number }, slot: RaceRing, fixed: boolean, within: Within): number {
  const low = within(slot.distance, 'tunnel') ? LOW_ALTITUDE : ROW_ALTITUDE, type = slot.type;
  const clearOfGaps = type !== 'risk' && !within(slot.distance, 'gap', 10, 10 + TRAIN_LENGTH * TRAIN_SPACING);
  if (clearOfGaps && shape < odds.row) {
    const row = rings.filter(r => r.row !== undefined).length / ROW_LANES.length;
    for (const x of ROW_LANES) rings.push({ ...ring(slot.distance, x, low, type), row });
    return 0;
  }
  if (clearOfGaps && shape < odds.row + odds.train) {
    const x = fixed ? slot.x : ROW_LANES.reduce((a, b) => Math.abs(b - slot.x) < Math.abs(a - slot.x) ? b : a);
    for (let i = 0; i < TRAIN_LENGTH; i++) rings.push({ ...ring(slot.distance + i * TRAIN_SPACING, x, within(slot.distance + i * TRAIN_SPACING, 'tunnel') ? LOW_ALTITUDE : low, i % 2 ? 'charge' : 'nitro'), train: true });
    return (TRAIN_LENGTH - 1) * TRAIN_SPACING;
  }
  rings.push(slot);
  return 0;
}

// Consecutive groups of 3-5 gates (the last group absorbs the remainder); a row is one gate, a train its own group.
function assignGroups(rings: RaceRing[], random: () => number): void {
  const gates: RaceRing[][] = [], trains: RaceRing[][] = [];
  for (const r of rings) {
    const last = (r.train ? trains : gates).at(-1);
    if (last && (r.train ? last.at(-1)!.distance + TRAIN_SPACING === r.distance : r.row !== undefined && last[0].row === r.row)) last.push(r);
    else (r.train ? trains : gates).push([r]);
  }
  let group = 0;
  for (let i = 0; i < gates.length; group++) {
    const left = gates.length - i;
    let size = 3 + Math.floor(random() * 3);
    if (left - size < 3) size = left <= 5 ? left : left - 3;
    for (const gate of gates.slice(i, i + size)) for (const r of gate) Object.assign(r, { group, groupSize: size });
    i += size;
  }
  for (const train of trains) { for (const r of train) Object.assign(r, { group, groupSize: train.length }); group++; }
}

// Rings come only from the track's 'rings' stream. Coast keeps its original gate grid (x 2.5, altitude 8);
// other tracks scatter them. Optional per-track ringGap / ringOdds / ringAltitudes / openingNitroRings /
// ringRows / ringTrains tune one track. A full-width row also greets the car past every broken bridge and tunnel exit.
export function createRings(track: TrackConfig, riskLines = true): RaceRing[] {
  const random = seededRng(track.seed, RACE_STREAMS.rings);
  const [gapMin, gapMax] = track.ringGap ?? RING_GAP, [charge, nitro, slip, risk] = track.ringOdds ?? RING_ODDS;
  const odds = { row: track.ringRows ?? ROW_ODDS, train: track.ringTrains ?? TRAIN_ODDS };
  const rings: RaceRing[] = [];
  const within: Within = (distance, type, before = 0, after = 0) => track.sections.some(s => s.type === type && distance + after >= s.from && distance - before < s.to);
  const trainRoom = track.length - 100 - TRAIN_LENGTH * TRAIN_SPACING; // a train never runs past the last ring line
  for (let distance = RING_SPACING * RING_GAP_SCALE, slot = 0; distance < track.length - 100; slot++) {
    const roll = random();
    let type = roll < charge ? 'charge' : roll < nitro ? 'nitro' : roll < slip ? 'slipstream' : roll < risk ? 'risk' : 'mystery';
    let x = 2.5;
    let altitude = track.ringAltitudes?.[slot % track.ringAltitudes.length] ?? 8;
    if (!track.fixedRings) {
      x = Math.round((random() * 2 - 1) * 70) / 10;
      altitude = type === 'risk' ? 10 : Math.round((3 + random() * 6) * 10) / 10;
    }
    if (rings.length < (track.openingNitroRings ?? 0)) type = 'nitro'; // after the rolls: the stream and positions stay the same
    if (within(distance, 'tunnel')) { // the car cannot climb in a tunnel, so a 'risk' ring there would be free
      altitude = LOW_ALTITUDE;
      if (type === 'risk') type = 'nitro';
    }
    const shape = random();
    distance += placeSlot(rings, shape, distance < trainRoom ? odds : { ...odds, train: 0 }, ring(distance, x, altitude, type), !!track.fixedRings, within);
    if (!riskLines && rings.at(-1)!.type === 'risk') Object.assign(rings.at(-1)!, { type: 'nitro', radius: RING_RADIUS }); // risk lines off: same layout, nitro rings
    const gap = track.fixedRings ? track.ringGap?.[0] ?? RING_SPACING : Math.round(gapMin + random() * (gapMax - gapMin));
    distance += Math.round(gap * RING_GAP_SCALE);
  }
  for (const s of track.sections) if ((s.type === 'gap' || s.type === 'tunnel') && s.to + 30 < track.length - 100 && !within(s.to + 30, 'gap', 10, 10) && !rings.some(r => Math.abs(r.distance - (s.to + 30)) < 15)) {
    placeSlot(rings, 0, { row: 1, train: 0 }, ring(s.to + 30, 0, ROW_ALTITUDE, 'charge'), false, () => false);
  }
  rings.sort((a, b) => a.distance - b.distance); // stable: a row keeps its lane order
  assignGroups(rings, random);
  return rings;
}

/** The player passes a gate: a full-width row is passed by any one of its rings, so it pays once. */
export function passGate(rings: readonly RaceRing[], gate: RaceRing & { lap?: number }): void {
  gate.hit = true;
  if (gate.row !== undefined) for (const r of rings as (RaceRing & { lap?: number })[]) if (r.row === gate.row && r.lap === gate.lap) r.hit = true;
}
