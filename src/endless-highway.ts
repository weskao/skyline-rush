import { seededRng } from './rng.ts';
import { ringRow, ringTrain, pickupRun, TRAIN_LANES } from './ring-layout.ts';

// Endless extends each themed route; finite sprint geometry and rules are unchanged.
export const ENDLESS_CHUNK = 500;
export const ENDLESS_COLLISIONS = 5;
// practice: the tutorial borrows the endless road only; no encounters stream in and no collision limit ends it.
export interface EndlessState { chunk: number; milestones: number; practice?: boolean }
interface Encounter { chunk?: number; distance: number }
interface Traffic extends Encounter { x: number; homeX: number; speed: number; cruise: number; altitude: number; cooldown: number; color: number }
interface Pickup extends Encounter { x: number; altitude: number; tier: string; taken?: boolean }
interface Ring extends Encounter { x: number; altitude: number; radius: number; type: string; group: number; groupSize?: number; row?: boolean; train?: number; hit?: boolean }
interface EndlessRace {
  mode: string; trackId: string; seed: number; phase: string; elapsed: number;
  endless?: EndlessState;
  sections: unknown[]; traffic: Traffic[]; pickups: Pickup[]; rings: Ring[];
  player: { distance: number; collisions: number; groupHits: Record<string, number>; speed: number;
    thrusting: boolean; boosting: boolean; score: number; nearMisses: number; nitroUses: number;
    rings: number; perfectLines: number };
  result: unknown;
  streamProps?: (distance: number) => void;
}
const lanes = [-7.5, -2.5, 2.5, 7.5];
const SINGLES_AT = [60, 140, 440]; // m into the chunk: clear of the row (200) and the train (260-385)
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
  for (let i = 0; i < 5; i++) race.pickups.push(...pickupRun({ chunk, distance: start + 90 + i * 88,
    x: lane(), altitude: random() < .8 ? 0 : 5, tier: random() < .7 ? 'can' : 'tank' }, random));
  for (const [i, at] of SINGLES_AT.entries()) race.rings.push({ chunk, distance: start + at,
    x: lane(), altitude: 5 + random() * 3, radius: 4.8, type: i === 1 ? 'nitro' : 'charge', group: chunk });
  // User, 2026-11-02: each chunk adds a ring train (its own PERFECT LINE group) and, one chunk in three, a full-width
  // row that joins the chunk's group as one gate. User, 2026-11-03: a train in every chunk, down a middle lane and
  // mostly on the road, and a fifth pickup run.
  if (random() < 1 / 3) {
    for (const ring of race.rings) if (ring.chunk === chunk) ring.groupSize = SINGLES_AT.length + 1;
    for (const ring of ringRow(start + 200, 'charge')) race.rings.push({ chunk, ...ring, group: chunk, groupSize: SINGLES_AT.length + 1 });
  }
  const train = ringTrain(start + 260, TRAIN_LANES[random() < .5 ? 0 : 1]!, random() < .2);
  for (const ring of train) race.rings.push({ chunk, ...ring, group: chunk + .5, groupSize: train.length });
}
function retainWindow<T extends Encounter>(items: T[], first: number, last: number): void {
  let count = 0;
  for (const item of items) if (item.chunk !== undefined && item.chunk >= first && item.chunk <= last) items[count++] = item;
  items.length = count;
}
/** Streaming runs only when crossing a chunk; ordinary simulation ticks allocate nothing here. */
export function streamEndless(race: EndlessRace): void {
  if (!race.endless || race.endless.practice) return;
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
  race.streamProps?.(race.player.distance);
  race.endless.chunk = chunk;
}
export function prepareEndless(race: EndlessRace): void {
  if (race.mode !== 'endless') return;

  race.sections.length = race.traffic.length = race.pickups.length = race.rings.length = 0;
  race.endless = { chunk: -10, milestones: 0 };
  streamEndless(race);
}
/** A collision limit ends a completed survival attempt; it is an eligible distance result. */
export function finishEndless(race: EndlessRace): boolean {
  if (!race.endless || race.endless.practice) return false;
  race.endless.milestones = Math.floor(race.player.distance / 1000);
  const car = race.player;
  if (car.collisions < ENDLESS_COLLISIONS) return false;
  race.result = { position: 1, time: race.elapsed, distance: car.distance, score: Math.round(car.score),
    collisions: car.collisions, nearMisses: car.nearMisses, nitroUses: car.nitroUses,
    rings: car.rings, perfectLines: car.perfectLines, stars: 0, success: true, endReason: 'collisions' };
  race.phase = 'finished'; car.speed = 0; car.thrusting = car.boosting = false;
  return true;
}
