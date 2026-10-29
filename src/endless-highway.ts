import { seededRng } from './rng.ts';

// Coast v1 extends the existing classicRoadCenter, never a finite route or lap.
export const ENDLESS_CHUNK = 500;
export const ENDLESS_COLLISIONS = 5;
export interface EndlessState { chunk: number; milestones: number }
interface Encounter { chunk?: number; distance: number }
interface Traffic extends Encounter { x: number; homeX: number; speed: number; cruise: number; altitude: number; cooldown: number; color: number }
interface Pickup extends Encounter { x: number; altitude: number; tier: string; taken?: boolean }
interface Ring extends Encounter { x: number; altitude: number; radius: number; type: string; group: number; hit?: boolean }
interface EndlessRace {
  mode: string; trackId: string; seed: number; phase: string; elapsed: number;
  endless?: EndlessState;
  sections: unknown[]; traffic: Traffic[]; pickups: Pickup[]; rings: Ring[];
  player: { distance: number; collisions: number; groupHits: Record<string, number>; speed: number;
    thrusting: boolean; boosting: boolean; score: number; nearMisses: number; nitroUses: number;
    rings: number; perfectLines: number };
  result: unknown;
}
const lanes = [-7.5, -2.5, 2.5, 7.5];
// New chunks gradually add traffic up to eight cars per 500 m at 20 km.
export const endlessTrafficCount = (distance: number): number => 4 + Math.min(4, Math.floor(Math.max(0, distance) / 5000));

function addChunk(race: EndlessRace, chunk: number): void {
  const random = seededRng(race.seed, 'endless-v1:' + chunk);
  const lane = (): number => lanes[Math.floor(random() * lanes.length)]!;
  const start = chunk * ENDLESS_CHUNK;
  const count = endlessTrafficCount(start);
  for (let i = 0; i < count; i++) {
    const x = lane(), speed = 23 + Math.floor(random() * 5) * 3;
    const car = { chunk, x, homeX: x, distance: start + 60 + i * 420 / count,
      speed, cruise: speed, altitude: 0, cooldown: 0, color: Math.floor(random() * 5) };
    if (race.traffic.length < 40) race.traffic.push(car);
  }
  for (let i = 0; i < 4; i++) race.pickups.push({ chunk, distance: start + 90 + i * 110,
    x: lane(), altitude: random() < .8 ? 0 : 5, tier: random() < .7 ? 'can' : 'tank' });
  for (let i = 0; i < 3; i++) race.rings.push({ chunk, distance: start + 100 + i * 160,
    x: lane(), altitude: 5 + random() * 3, radius: 4.8, type: i === 1 ? 'nitro' : 'charge', group: chunk });
}
function retainWindow<T extends Encounter>(items: T[], first: number, last: number): void {
  let count = 0;
  for (const item of items) if (item.chunk !== undefined && item.chunk >= first && item.chunk <= last) items[count++] = item;
  items.length = count;
}
/** Streaming runs only when crossing a chunk; ordinary simulation ticks allocate nothing here. */
export function streamEndless(race: EndlessRace): void {
  if (!race.endless) return;
  const chunk = Math.floor(race.player.distance / ENDLESS_CHUNK), old = race.endless.chunk;
  if (chunk === old) return;
  const first = Math.max(0, chunk - 1), last = chunk + 3;
  // Moving traffic can outlive its spawn chunk while still visible ahead of the player.
  let retained = 0;
  for (const car of race.traffic) if (car.distance >= race.player.distance - 60 && car.distance < (last + 1) * ENDLESS_CHUNK) race.traffic[retained++] = car;
  race.traffic.length = retained;
  retainWindow(race.pickups, first, last); retainWindow(race.rings, first, last);
  for (let next = first; next <= last; next++) {
    if (next >= Math.max(0, old - 1) && next <= old + 3) continue;
    addChunk(race, next);
  }
  race.pickups.sort((a, b) => a.distance - b.distance);
  race.rings.sort((a, b) => a.distance - b.distance);
  for (const key of Object.keys(race.player.groupHits)) if (+key < first || +key > last) delete race.player.groupHits[key];
  race.endless.chunk = chunk;
}
export function prepareEndless(race: EndlessRace): void {
  if (race.mode !== 'endless') return;
  if (race.trackId !== 'coast') throw new RangeError('Endless Highway v1 supports Coast only');
  race.sections.length = race.traffic.length = race.pickups.length = race.rings.length = 0;
  race.endless = { chunk: -10, milestones: 0 };
  streamEndless(race);
}
/** A collision limit ends a completed survival attempt; it is an eligible distance result. */
export function finishEndless(race: EndlessRace): boolean {
  if (!race.endless) return false;
  race.endless.milestones = Math.floor(race.player.distance / 1000);
  const car = race.player;
  if (car.collisions < ENDLESS_COLLISIONS) return false;
  race.result = { position: 1, time: race.elapsed, distance: car.distance, score: Math.round(car.score),
    collisions: car.collisions, nearMisses: car.nearMisses, nitroUses: car.nitroUses,
    rings: car.rings, perfectLines: car.perfectLines, stars: 0, success: true, endReason: 'collisions' };
  race.phase = 'finished'; car.speed = 0; car.thrusting = car.boosting = false;
  return true;
}
