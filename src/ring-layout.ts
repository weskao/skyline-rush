import { seededRng, RACE_STREAMS } from './rng.ts';
import type { TrackConfig } from './game-types.ts';

export const RING_RADIUS = 4.8;
export const RISK_RING_RADIUS = 2.4;
const RING_START = 110; // m: the first ring is never on the starting grid
// Cumulative roll thresholds for charge / nitro / slipstream / risk; the rest is mystery.
const RING_ODDS: readonly [number, number, number, number] = [0.35, 0.6, 0.78, 0.9];
// User, 2026-11-02: rings and pickups each scale with the grid, this many slots per car (per lap in Circuit). A few ring
// slots become a train or a full-width row and pickup slots trail a short run of cells (user, same day), so the
// extra items come in readable runs instead of a denser scatter. User, 2026-11-03: a medium step up (4 before).
export const ITEMS_PER_CAR = 5;
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
  /** Part of a full-width ring row: a car takes at most one ring of the row at this distance. */
  row?: boolean;
  /** Index in a ring train (consecutive rings down one lane, its own PERFECT LINE group). */
  train?: number;
}

const ring = (distance: number, x: number, altitude: number, type: string): RaceRing =>
  ({ distance, x, altitude, radius: type === 'risk' ? RISK_RING_RADIUS : RING_RADIUS, type, group: 0 });

// Consecutive groups of 3-5 gates (the last group absorbs the remainder; fewer than 3 make one group); a full-width
// row is one gate, a train its own group.
function assignGroups(gates: RaceRing[][], trains: RaceRing[][], random: () => number): void {
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

// User, 2026-11-02: a few ring slots become a run of consecutive rings (on the road or in the air) or a full-width row
// any car on the road passes. Shapes roll on their own stream, so every slot keeps its position and type roll.
const ROW_LANES = [-7.5, -2.5, 2.5, 7.5]; // game.js LANES (this module sits below game.js)
// User, 2026-11-03: trains run mostly on the road, so driving straight chains them. Endless keeps them on a middle lane
// (lane 2 or 3); on a track a train runs down its slot's lane, any of the four (user, 2026-11-07).
export const TRAIN_LANES = [-2.5, 2.5];
const LINE_STAY = 0.65; // odds a ring keeps the previous ring's lane
const TRAIN_AIR_ODDS = 0.2;
// Lanes 5 m apart, radius 4.8: anywhere on the road (x ±10.2) from the surface up to about 6.4 m passes one ring.
export const ROW_ALTITUDE = 2.5;
const TRAIN_AIR = 7; // an air train asks for flight; a ground train sits at ROW_ALTITUDE
export const TRAIN_SPACING = 25; // m
// Balance: a train pays mostly charge and slipstream, one nitro; its PERFECT LINE adds the usual +1 NITRO.
const TRAIN_TYPES = ['charge', 'slipstream', 'charge', 'nitro', 'slipstream', 'charge'];
const ROW_ODDS = 0.08, TRAIN_ODDS = 0.25; // per slot
const SHAPE_CLEARANCE = 40; // m from any road section or hoop
const OPENING_SINGLES = 2; // the first slots stay single, so openingNitroRings still opens on a nitro ring

export const ringRow = (distance: number, type: string): RaceRing[] =>
  ROW_LANES.map(x => ({ ...ring(distance, x, ROW_ALTITUDE, type), row: true }));
export const ringTrain = (distance: number, x: number, air: boolean): RaceRing[] =>
  TRAIN_TYPES.map((type, i) => ({ ...ring(distance + i * TRAIN_SPACING, x, air ? TRAIN_AIR : ROW_ALTITUDE, type), train: i }));

function shapeSlots(slots: RaceRing[], track: TrackConfig, seed: number, avoid: readonly number[]) {
  const random = seededRng(seed, RACE_STREAMS.ringShapes), span = (TRAIN_TYPES.length - 1) * TRAIN_SPACING;
  const clear = (from: number, to: number) => to < track.length - 100
    && !track.sections.some(s => to >= s.from - SHAPE_CLEARANCE && from <= s.to + SHAPE_CLEARANCE)
    && avoid.every(a => a < from - SHAPE_CLEARANCE || a > to + SHAPE_CLEARANCE);
  const gates: RaceRing[][] = [], trains: RaceRing[][] = [];
  slots.forEach((slot, i) => {
    const roll = random(), air = random() < TRAIN_AIR_ODDS, d = slot.distance; // both drawn every slot: shapes never shift
    // Risk lines keep their narrow single rings (and their frequency): only other slots take a shape.
    if (i < OPENING_SINGLES || slot.type === 'risk') gates.push([slot]);
    else if (roll < ROW_ODDS && clear(d, d)) gates.push(ringRow(d, slot.type));
    // A train also keeps SHAPE_CLEARANCE from the previous one: chains, not a bunch (Circuit has a slot every 45 m).
    else if (roll < ROW_ODDS + TRAIN_ODDS && clear(d, d + span) && d > (trains.at(-1)?.at(-1)?.distance ?? -Infinity) + SHAPE_CLEARANCE) {
      trains.push(ringTrain(d, slot.x, air));
    } else gates.push([slot]);
  });
  return { gates, trains };
}

/** `count` random distances, one per equal slice of [from, to): re-rolled per seed, yet spread over the whole track. */
export function spreadDistances(count: number, from: number, to: number, random: () => number): number[] {
  const slice = (to - from) / count;
  return Array.from({ length: count }, (_, i) => Math.round(from + (i + random()) * slice));
}

// `count` ring slots from the 'rings' stream of `seed` (the track seed unless a race re-rolls it), a few shaped into
// trains or rows clear of sections and the hoops at `avoid`. Every ring sits on a lane; fixedRings (Coast) keeps
// its gate heights from ringAltitudes, other tracks scatter altitude. Optional per-track ringOdds / openingNitroRings tune one track.
export function createRings(track: TrackConfig, riskLines = true, count = ITEMS_PER_CAR, seed = track.seed, avoid: readonly number[] = []): RaceRing[] {
  const random = seededRng(seed, RACE_STREAMS.rings);
  const [charge, nitro, slip, risk] = track.ringOdds ?? RING_ODDS;
  const inTunnel = (distance: number) => track.sections.some(s => s.type === 'tunnel' && distance >= s.from && distance < s.to);
  let lane = 0;
  const rings = spreadDistances(count, RING_START, track.length - 100, random).map((distance, slot) => {
    const roll = random();
    let type = roll < charge ? 'charge' : roll < nitro ? 'nitro' : roll < slip ? 'slipstream' : roll < risk ? 'risk' : 'mystery';
    // User, 2026-11-07: a ring line holds its lane for about three rings, then moves to any of the four lanes (it sat
    // in one lane on some maps). Both draws every slot, so the stream never shifts.
    const stay = random() < LINE_STAY, pick = ROW_LANES[Math.floor(random() * ROW_LANES.length)]!;
    const x = lane = slot > 0 && stay ? lane : pick;
    let altitude = track.ringAltitudes?.[slot % track.ringAltitudes.length] ?? 8;
    if (!track.fixedRings) altitude = type === 'risk' ? 10 : Math.round((3 + random() * 6) * 10) / 10;
    if (slot < (track.openingNitroRings ?? 0)) type = 'nitro'; // after the rolls: the stream and positions stay the same
    if (inTunnel(distance)) { // the car cannot climb in a tunnel, so a 'risk' ring there would be free
      altitude = LOW_ALTITUDE;
      if (type === 'risk') type = 'nitro';
    }
    return ring(distance, x, altitude, type);
  });
  const { gates, trains } = shapeSlots(rings, track, seed, avoid);
  // Risk lines off: the same layout (shapes included), nitro rings.
  if (!riskLines) for (const r of rings) if (r.type === 'risk') Object.assign(r, { type: 'nitro', radius: RING_RADIUS });
  assignGroups(gates, trains, random);
  return [...gates.flat(), ...trains.flat()].sort((a, b) => a.distance - b.distance); // stable: a row keeps its lane order
}

/** A pickup slot and the 0-3 cells trailing it down its line, 8 m apart (user, 2026-11-02: runs of 1-4); a trailing
 * cell that would sit over a gap hole or in a tunnel roof is left out. */
export function pickupRun<T extends { distance: number; tier: string }>(pickup: T, random: () => number, blocked: (p: T) => boolean = () => false): (T & { run?: boolean })[] {
  const run: (T & { run?: boolean })[] = [pickup];
  for (let i = 1, n = 1 + Math.floor(random() * 4); i < n; i++) run.push({ ...pickup, distance: pickup.distance + i * 8, tier: 'cell', run: true });
  return run.filter((p, i) => i === 0 || !blocked(p));
}
