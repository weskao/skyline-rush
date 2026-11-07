// User, 2026-11-07: a player well behind the leader in Classic (not the Daily challenge, which has a leaderboard) or
// Cup finds a few extra catch-up rings ahead. They are added beyond the 900 m draw range (effects.js), so they
// come into view like any other ring (docs/superpowers/specs/2026-11-07-catch-up-items-design.md).
import { seededRng, RACE_STREAMS } from './rng.ts';
import { RING_RADIUS, ROW_ALTITUDE } from './ring-layout.ts';

export const CATCH_UP = Object.freeze({
  on: 150, off: 50, full: 300, // m behind the leader: switch on, switch off (hysteresis), full strength
  slowest: 12, fastest: 6, // s between items at the weakest / full strength
  ahead: 950, spread: 80, // m ahead of the player: past the 900 m draw range
  maxItems: 12, clearance: 40, spacing: 25, // reference budget; fixed physical placement safety margins
  referenceLength: 6000, metresPerItem: 400, drawRange: 900, finishReserve: 100,
});
/** Derive the catch-up budget, cadence and lead-gap thresholds from the current race's TOTAL length.
 *  The baseline is 6 km. Physical draw/section/item/finish clearance never shrinks.
 *  Missing/invalid or very short lengths have a zero-item budget.
 */
export function catchUpSettings(length: number) {
  const metres = Number.isFinite(length) ? Math.max(0, length) : 0;
  const scale = Math.max(0.75, Math.min(1.5, Math.sqrt(metres / CATCH_UP.referenceLength)));
  const ahead = CATCH_UP.drawRange + Math.round((CATCH_UP.ahead - CATCH_UP.drawRange) * scale);
  const spread = Math.round(CATCH_UP.spread * scale);
  return {
    on: Math.round(CATCH_UP.on * scale),
    off: Math.round(CATCH_UP.off * scale),
    full: Math.round(CATCH_UP.full * scale),
    fastest: CATCH_UP.fastest * scale,
    slowest: CATCH_UP.slowest * scale,
    ahead, spread,
    maxItems: Math.max(0, Math.floor((metres - ahead - spread - CATCH_UP.finishReserve) / CATCH_UP.metresPerItem)),
    clearance: CATCH_UP.clearance,
    spacing: CATCH_UP.spacing,
    finishReserve: CATCH_UP.finishReserve,
  };
}

const LANES = [-7.5, -2.5, 2.5, 7.5]; // game.js LANES (this module sits below game.js)
const RING_TYPES = ['nitro', 'nitro', 'nitro', 'charge', 'slipstream']; // 60 / 20 / 20 %

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

/** Runs once per race step: adds at most one catch-up ring when the player trails the leader. */
export function spawnCatchUp(race: CatchUpRace): void {
  if (race.catchUp === undefined) race.catchUp = race.rivals.length && ((race.mode === 'classic' && !race.modifier) || race.mode === 'cup')
    ? { active: false, next: 0, added: 0, tries: 0 } : null;
  const state = race.catchUp;
  if (!state) return;
  const rules = catchUpSettings(race.length);
  if (state.added >= rules.maxItems) return;
  const car = race.player;
  let leader = -Infinity;
  for (const rival of race.rivals) leader = Math.max(leader, rival.distance); // per step: no allocation
  const gap = leader - car.distance;
  if (!state.active && gap >= rules.on) state.next = race.elapsed + rules.fastest; // the first item waits too
  state.active = state.active ? gap >= rules.off : gap >= rules.on;
  if (!state.active || race.elapsed < state.next) return;
  const random = seededRng(race.seed, `${RACE_STREAMS.catchUp}:${state.tries++}`), distance = Math.round(car.distance + rules.ahead + random() * rules.spread);
  const nearest = LANES.reduce((best, x, i) => Math.abs(x - car.x) < Math.abs(LANES[best]! - car.x) ? i : best, 0);
  const x = LANES[Math.min(3, Math.max(0, nearest + Math.floor(random() * 3) - 1))]!, type = RING_TYPES[Math.floor(random() * RING_TYPES.length)]!;
  // A blocked spot is skipped, never moved: the next step tries a new one.
  if (distance > race.length - rules.finishReserve || race.sections.some(s => distance >= s.from - rules.clearance && distance <= s.to + rules.clearance)
    || [race.rings, race.pickups].some(items => items.some(item => Math.abs(item.distance - distance) < rules.spacing))) return;
  if (!state.added) race.rings.forEach((r, i) => { r.mysteryIndex ??= i; }); // an insert must not reshuffle mystery effects
  // group -1 / groupSize Infinity: a catch-up ring never completes a PERFECT LINE.
  insertSorted(race.rings, { distance, x, altitude: ROW_ALTITUDE, radius: RING_RADIUS, type, group: -1, groupSize: Infinity, catchUp: true } as Item);
  state.added++;
  const strength = Math.min(1, (gap - rules.on) / (rules.full - rules.on));
  state.next = race.elapsed + rules.slowest - Math.max(0, strength) * (rules.slowest - rules.fastest);
}
