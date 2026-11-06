// User, 2026-11-07: a player well behind the leader in Classic (not the Daily challenge, which has a leaderboard) or
// Cup finds a few extra rings and NITRO cans ahead. They are added beyond the 900 m draw range (effects.js), so they
// come into view like any other ring (docs/superpowers/specs/2026-11-07-catch-up-items-design.md).
import { seededRng, RACE_STREAMS } from './rng.ts';
import { RING_RADIUS, ROW_ALTITUDE } from './ring-layout.ts';

export const CATCH_UP = Object.freeze({
  on: 150, off: 50, full: 300, // m behind the leader: switch on, switch off (hysteresis), full strength
  slowest: 12, fastest: 6, // s between items at the weakest / full strength
  ahead: 950, spread: 80, // m ahead of the player: past the 900 m draw range
  maxItems: 12, clearance: 40, spacing: 25, // per race; m from road sections; m from any ring or pickup
});
const LANES = [-7.5, -2.5, 2.5, 7.5]; // game.js LANES (this module sits below game.js)
const RING_TYPES = ['charge', 'charge', 'nitro', 'nitro', 'slipstream']; // 40 / 40 / 20 %

interface Item { distance: number; x: number; altitude: number; catchUp?: boolean; mysteryIndex?: number }
interface CatchUpRace {
  mode: string; modifier: string | null; elapsed: number; length: number; seed: number;
  player: { distance: number; x: number }; rivals: { distance: number }[];
  sections: { from: number; to: number }[]; rings: Item[]; pickups: Item[];
  catchUp?: { active: boolean; next: number; added: number; tries: number } | null; // plain data: races are structuredClone'd
}

const insertSorted = (items: Item[], item: Item) => {
  const at = items.findIndex(other => other.distance > item.distance);
  items.splice(at < 0 ? items.length : at, 0, item);
};

/** Runs once per race step: adds at most one catch-up ring or NITRO can when the player trails the leader. */
export function spawnCatchUp(race: CatchUpRace): void {
  if (race.catchUp === undefined) race.catchUp = race.rivals.length && ((race.mode === 'classic' && !race.modifier) || race.mode === 'cup')
    ? { active: false, next: 0, added: 0, tries: 0 } : null;
  const state = race.catchUp;
  if (!state || state.added >= CATCH_UP.maxItems) return;
  const car = race.player;
  let leader = -Infinity;
  for (const rival of race.rivals) leader = Math.max(leader, rival.distance); // per step: no allocation
  const gap = leader - car.distance;
  if (!state.active && gap >= CATCH_UP.on) state.next = race.elapsed + CATCH_UP.fastest; // the first item waits too
  state.active = state.active ? gap >= CATCH_UP.off : gap >= CATCH_UP.on;
  if (!state.active || race.elapsed < state.next) return;
  const random = seededRng(race.seed, `${RACE_STREAMS.catchUp}:${state.tries++}`), distance = Math.round(car.distance + CATCH_UP.ahead + random() * CATCH_UP.spread);
  const nearest = LANES.reduce((best, x, i) => Math.abs(x - car.x) < Math.abs(LANES[best]! - car.x) ? i : best, 0);
  const x = LANES[Math.min(3, Math.max(0, nearest + Math.floor(random() * 3) - 1))]!, ring = random() < 0.5, type = RING_TYPES[Math.floor(random() * RING_TYPES.length)]!;
  // A blocked spot is skipped, never moved: the next step tries a new one.
  if (distance > race.length - 100 || race.sections.some(s => distance >= s.from - CATCH_UP.clearance && distance <= s.to + CATCH_UP.clearance)
    || [race.rings, race.pickups].some(items => items.some(item => Math.abs(item.distance - distance) < CATCH_UP.spacing))) return;
  if (!state.added) race.rings.forEach((r, i) => { r.mysteryIndex ??= i; }); // an insert must not reshuffle mystery effects
  // group -1 / groupSize Infinity: a catch-up ring never completes a PERFECT LINE.
  if (ring) insertSorted(race.rings, { distance, x, altitude: ROW_ALTITUDE, radius: RING_RADIUS, type, group: -1, groupSize: Infinity, catchUp: true } as Item);
  else insertSorted(race.pickups, { distance, x, altitude: 0, tier: 'can', catchUp: true } as Item);
  state.added++;
  const strength = Math.min(1, (gap - CATCH_UP.on) / (CATCH_UP.full - CATCH_UP.on));
  state.next = race.elapsed + CATCH_UP.slowest - Math.max(0, strength) * (CATCH_UP.slowest - CATCH_UP.fastest);
}
