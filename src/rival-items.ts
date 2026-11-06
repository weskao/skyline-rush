import { RACE_DRIVER_IDS } from './race-grid.ts';
import { NITRO_MAX, NITRO_PICKUPS, RING_NITRO } from './ring-layout.ts';
import { NITRO_CAP_BONUS } from './drive-rules.ts';
import { RACE_TRACKS } from './race-tracks.ts';

// Stage 2 (user, 2026-11-02): a ring or pickup taken by any car is gone this long, then back for everyone.
export const ITEM_RESPAWN = 2.5; // s
// User 2026-11-07: rivals start without NITRO and take as many items as they reach, like the player. The per-race
// take caps (Easy 2 / Normal 4 / Hard 6 since 2026-11-03) are gone: skill, not a cap, sets the difficulty.

interface Collectible { distance: number; x: number; altitude: number; downUntil?: number }
interface PickupItem extends Collectible { tier: string }
interface RingItem extends Collectible { type: string; radius: number; row?: boolean }
/** What the renderer shows when a rival collects (`effects.js`). */
export interface RivalTake { time: number; distance: number; x: number; altitude: number; kind: string }
export interface RivalCollector { x: number; altitude: number; distance: number; nitro: number; itemTakes: number; lastTake: RivalTake | null }
interface CollectRace { trackId: string; elapsed: number; config: { difficulty?: string }; pickups: PickupItem[]; rings: RingItem[] }

/** The rivals' skill level: the race's difficulty, except Easy and Normal on an opening map (user, 2026-11-07) are 'intro'. */
export function rivalLevel(race: { trackId: string; config: { difficulty?: string } }): string {
  const level = race.config.difficulty ?? 'normal';
  return level !== 'hard' && RACE_TRACKS[race.trackId]?.introRivals ? 'intro' : level;
}

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
  const altitude = rival.altitude || 0;
  for (let i = firstAfter(race.pickups, before); i < race.pickups.length && race.pickups[i]!.distance <= rival.distance; i++) {
    const p = race.pickups[i]!, amount = p.tier === 'overcharge' ? 0 : NITRO_PICKUPS[p.tier] ?? 0;
    if (amount && !gone(p, race.elapsed) && Math.abs(p.x - rival.x) < 1.7 && Math.abs(p.altitude - altitude) < 1.8) take(race, rival, p, amount, p.tier);
  }
  let rowTaken = NaN; // a full-width ring row pays once per car
  for (let i = firstAfter(race.rings, before); i < race.rings.length && race.rings[i]!.distance <= rival.distance; i++) {
    const r = race.rings[i]!, amount = RING_NITRO[r.type] ?? 0;
    if (amount && !gone(r, race.elapsed) && !(r.row && r.distance === rowTaken) && Math.hypot(r.x - rival.x, r.altitude - altitude) < r.radius) {
      take(race, rival, r, amount, r.type);
      if (r.row) rowTaken = r.distance;
    }
  }
}

// Rival NITRO timing by personality (rival-driver.ts adds race sense on Normal and Hard). Like the player, a rival
// starts with no charge (user, 2026-11-07) and gets the player's NITRO cap bonus.
export const RIVAL_NITRO_CHARGES = 0;
export const RIVAL_NITRO_BONUS = NITRO_CAP_BONUS;
export const RIVAL_NITRO_NOVA_FIRST = 8; // NOVA (steady): first charge at this race second...
export const RIVAL_NITRO_NOVA_EVERY = 18; // ...then one every this many seconds
export const RIVAL_NITRO_ORBIT_ALTITUDE = 2; // ORBIT (loves flying): fires in the air, once per hop...
export const RIVAL_NITRO_MIN_SPEED = 60; // ...and only once up to speed (a charge only lifts the cap)
export const RIVAL_NITRO_APEX_FROM = 0.75; // APEX (late surge): fires from this fraction of the race
export const RIVAL_HOP_PERIOD: Readonly<Record<string, number>> = { NOVA: 13, ORBIT: 9, APEX: 13 }; // seconds per hop cycle; shorter = more hops

// Rivals go after the nearest reachable NITRO item ahead by changing lane: `seekX` only replaces their home lane
// as avoidObstacles' wish (car-collisions.js), so a blocked line still wins and nothing is driven through.
// Every difficulty seeks (user, 2026-11-07); skill sets how far ahead it looks and how far sideways it will go.
export const RIVAL_SEEK: Readonly<Record<string, { ahead: number; reach: number }>> = {
  intro: { ahead: 0, reach: 0 }, // takes only what lies on its line
  easy: { ahead: 100, reach: 5 }, // the next lane over only
  normal: { ahead: 100, reach: 5 }, // the next lane over (user 2026-11-07: Normal a little easier; was two lanes)
  hard: { ahead: 160, reach: Infinity },
};
type Seeker = RivalCollector & { seekX?: number };
function nextWanted<T extends Collectible>(items: readonly T[], rival: Seeker, now: number, seek: { ahead: number; reach: number }, wanted: (item: T, altitude: number) => boolean): T | undefined {
  const altitude = rival.altitude || 0;
  for (let i = firstAfter(items, rival.distance); i < items.length && items[i]!.distance <= rival.distance + seek.ahead; i++) {
    if (!gone(items[i]!, now) && Math.abs(items[i]!.x - rival.x) <= seek.reach && wanted(items[i]!, altitude)) return items[i];
  }
  return undefined;
}
export function rivalSeek(race: CollectRace, rival: Seeker): void {
  rival.seekX = undefined;
  const seek = RIVAL_SEEK[rivalLevel(race)] ?? RIVAL_SEEK.normal!;
  const pickup = nextWanted(race.pickups, rival, race.elapsed, seek, (p, alt) => p.tier !== 'overcharge' && !!NITRO_PICKUPS[p.tier] && Math.abs(p.altitude - alt) < 1.8);
  // A full-width ring row is already on every lane: no lane change for it.
  const ring = nextWanted(race.rings, rival, race.elapsed, seek, (r, alt) => !r.row && !!RING_NITRO[r.type] && Math.abs(r.altitude - alt) < r.radius);
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
