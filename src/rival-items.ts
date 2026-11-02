import { RACE_DRIVER_IDS } from './race-grid.ts';
import { NITRO_MAX, NITRO_PICKUPS, RING_NITRO } from './ring-layout.ts';

// Stage 2 (user, 2026-11-02): a ring or pickup taken by any car is gone this long, then back for everyone.
export const ITEM_RESPAWN = 2.5; // s
// Takes per rival per race, tuned with scripts/pickup-economy.mjs to the user's AC2 (2026-11-02): Easy takes a
// little, never nothing (AC3, +0.9 NITRO per race over 7 rivals); Normal +2.4; Hard, which also changes lane
// for items, +4.0 (5 takes since the 2026-11-02 trains, rows and pickup runs: races end sooner, 4 gave +3.9).
export const EASY_RIVAL_TAKES = 2;
export const NORMAL_RIVAL_TAKES = 3;
export const HARD_RIVAL_TAKES = 5;
const TAKE_LIMIT: Readonly<Record<string, number>> = { easy: EASY_RIVAL_TAKES, normal: NORMAL_RIVAL_TAKES, hard: HARD_RIVAL_TAKES };

interface Collectible { distance: number; x: number; altitude: number; downUntil?: number }
interface PickupItem extends Collectible { tier: string }
interface RingItem extends Collectible { type: string; radius: number; row?: boolean }
/** What the renderer shows when a rival collects (`effects.js`). */
export interface RivalTake { time: number; distance: number; x: number; altitude: number; kind: string }
export interface RivalCollector { x: number; altitude: number; distance: number; nitro: number; itemTakes: number; lastTake: RivalTake | null }
interface CollectRace { elapsed: number; config: { difficulty?: string }; pickups: PickupItem[]; rings: RingItem[] }

const gone = (item: Collectible, now: number): boolean => item.downUntil !== undefined && item.downUntil > now;
// Index of the first item (sorted by distance) beyond d.
function firstAfter(items: readonly Collectible[], d: number): number {
  let lo = 0, hi = items.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (items[mid]!.distance <= d) lo = mid + 1; else hi = mid; }
  return lo;
}
function take(race: CollectRace, rival: RivalCollector, item: Collectible, amount: number, kind: string): void {
  item.downUntil = race.elapsed + ITEM_RESPAWN;
  rival.nitro = Math.min(NITRO_MAX, rival.nitro + amount); // the player's cap
  rival.itemTakes++;
  rival.lastTake = { time: race.elapsed, distance: item.distance, x: item.x, altitude: item.altitude, kind };
}

// A rival takes the NITRO rings (nitro, risk) and pickups (not the overcharge) it crosses this step, with the
// player's boxes: pickups within 1.7 m sideways and 1.8 m in height, rings inside their radius. Takes are
// shared: the item is gone for every car until it respawns.
export function rivalCollects(race: CollectRace, rival: RivalCollector, before: number): void {
  const limit = TAKE_LIMIT[race.config.difficulty ?? ''] ?? Infinity, altitude = rival.altitude || 0;
  for (let i = firstAfter(race.pickups, before); i < race.pickups.length && race.pickups[i]!.distance <= rival.distance; i++) {
    const p = race.pickups[i]!, amount = p.tier === 'overcharge' ? 0 : NITRO_PICKUPS[p.tier] ?? 0;
    if (rival.itemTakes >= limit) return;
    if (amount && !gone(p, race.elapsed) && Math.abs(p.x - rival.x) < 1.7 && Math.abs(p.altitude - altitude) < 1.8) take(race, rival, p, amount, p.tier);
  }
  let rowTaken = NaN; // a full-width ring row pays once per car
  for (let i = firstAfter(race.rings, before); i < race.rings.length && race.rings[i]!.distance <= rival.distance; i++) {
    const r = race.rings[i]!, amount = RING_NITRO[r.type] ?? 0;
    if (rival.itemTakes >= limit) return;
    if (amount && !gone(r, race.elapsed) && !(r.row && r.distance === rowTaken) && Math.hypot(r.x - rival.x, r.altitude - altitude) < r.radius) {
      take(race, rival, r, amount, r.type);
      if (r.row) rowTaken = r.distance;
    }
  }
}

// Rival NITRO and rubber-banding (rivals get RIVAL_NITRO_CHARGES charges, fired by personality).
export const RIVAL_NITRO_CHARGES = 2;
export const RIVAL_NITRO_BONUS = 12; // m/s added to the rival's speed cap during NITRO
export const RIVAL_NITRO_NOVA_FIRST = 8; // NOVA (steady): first charge at this race second...
export const RIVAL_NITRO_NOVA_EVERY = 18; // ...then one every this many seconds
export const RIVAL_NITRO_ORBIT_ALTITUDE = 2; // ORBIT (loves flying): fires in the air, once per hop...
export const RIVAL_NITRO_MIN_SPEED = 60; // ...and only once up to speed (a charge only lifts the cap)
export const RIVAL_NITRO_APEX_FROM = 0.75; // APEX (late surge): fires from this fraction of the race
export const RIVAL_HOP_PERIOD: Readonly<Record<string, number>> = { NOVA: 13, ORBIT: 9, APEX: 13 }; // seconds per hop cycle; shorter = more hops

// Hard rivals go after the nearest reachable NITRO item ahead by changing lane: `seekX` only replaces their
// home lane as avoidObstacles' wish (car-collisions.js), so a blocked line still wins and nothing is driven through.
const SEEK_AHEAD = 160; // m: two lanes (10 m) at the AI's 6 m/s lane shift take ~125 m at Hard pace
type Seeker = RivalCollector & { seekX?: number };
function nextWanted<T extends Collectible>(items: readonly T[], rival: Seeker, now: number, wanted: (item: T, altitude: number) => boolean): T | undefined {
  const altitude = rival.altitude || 0;
  for (let i = firstAfter(items, rival.distance); i < items.length && items[i]!.distance <= rival.distance + SEEK_AHEAD; i++) {
    if (!gone(items[i]!, now) && wanted(items[i]!, altitude)) return items[i];
  }
  return undefined;
}
export function rivalSeek(race: CollectRace, rival: Seeker): void {
  rival.seekX = undefined;
  if (race.config.difficulty !== 'hard' || rival.itemTakes >= (TAKE_LIMIT.hard ?? Infinity)) return;
  const pickup = nextWanted(race.pickups, rival, race.elapsed, (p, alt) => p.tier !== 'overcharge' && !!NITRO_PICKUPS[p.tier] && Math.abs(p.altitude - alt) < 1.8);
  // A full-width ring row is already on every lane: no lane change for it.
  const ring = nextWanted(race.rings, rival, race.elapsed, (r, alt) => !r.row && !!RING_NITRO[r.type] && Math.abs(r.altitude - alt) < r.radius);
  const target = pickup && (!ring || pickup.distance <= ring.distance) ? pickup : ring;
  if (target) rival.seekX = target.x;
}

/** `nitroUses`: charges fired so far, so charges a rival collects keep its rhythm instead of firing at once. */
export interface RivalNitroState { name: string; nitro: number; nitroUses: number; nitroHop: number; altitude: number; speed: number; distance: number }
export interface RaceClock { elapsed: number; length: number }

// Personality decides when a rival spends a charge (it must have a full one and no NITRO running).
export function rivalWantsNitro(race: RaceClock, rival: RivalNitroState, hop: number): boolean {
  if (rival.name === 'NOVA') return race.elapsed >= RIVAL_NITRO_NOVA_FIRST + rival.nitroUses * RIVAL_NITRO_NOVA_EVERY;
  if (rival.name === 'ORBIT') {
    const fire = rival.altitude > RIVAL_NITRO_ORBIT_ALTITUDE && rival.speed >= RIVAL_NITRO_MIN_SPEED && rival.nitroHop !== hop;
    if (fire) rival.nitroHop = hop;
    return fire;
  }
  if (rival.name === 'APEX') return rival.distance >= race.length * RIVAL_NITRO_APEX_FROM;
  return race.elapsed >= 10 + rival.nitroUses * (16 + RACE_DRIVER_IDS.indexOf(rival.name as typeof RACE_DRIVER_IDS[number]));
}
