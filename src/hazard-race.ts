// The player's crossings of race.hazards, resolved by the pure simulation.
// Authored entries (with a validated placement) move and act through ENV-04's
// hazardFrame/hazardContact; generated Gauntlet/practice hazards keep their original rules.
import { hazardX, type Hazard } from './hazards.ts';
import { hazardFrame, hazardContact } from './hazard-behavior.ts';
import type { HazardPlacement } from './hazard-schema.ts';
import { OBJECT_CATALOG, type GameplayEffect } from './object-catalog.ts';
import type { RiskRules } from './risk-lines.ts';

export type RaceHazard = Hazard & { halfWidth?: number; height?: number; placement?: HazardPlacement };
interface Car { distance: number; x: number; altitude?: number; speed: number }
interface PlayerCar extends Car { altitude: number; cooldown: number; score: number; nearMisses: number }
type Contact = (race: unknown, kind: 'barrier', obstacleX: number, intensity: number, retention: number) => void;

const BARRIER_HALF_WIDTH = 1.55; // drawn gauntlet barrier: 3.1 m wide
const GUST_SHOVE = 1.5, ROAD_LIMIT = 9, TERRAIN_RETENTION = 0.85; // m sideways, m, share of speed kept

/** Where a hazard is at a race time; inactive ones (a switched-off energy barrier) are not solid. */
export function hazardPose(h: RaceHazard, time: number): { x: number; altitude: number; active: boolean } {
  if (!h.placement) return { x: hazardX(h, time), altitude: h.altitude, active: true };
  const frame = hazardFrame(h.placement, time);
  return { x: frame.lateralOffset, altitude: frame.altitude, active: frame.active };
}

/** Half-width an AI keeps clear of, covering a moving hazard's whole sweep; 0 = never steer around it. */
export function hazardReach(h: RaceHazard): number {
  const move = h.placement?.movementPattern;
  if (!move) return (h.halfWidth ?? BARRIER_HALF_WIDTH) + (h.moving ? 1.8 : 0);
  if (!['block', 'slow'].includes(effectOf(h) ?? '')) return 0;
  return (h.halfWidth ?? BARRIER_HALF_WIDTH) + (move.kind === 'sweep' ? move.amplitude : 0);
}

const effectOf = (h: RaceHazard): GameplayEffect | null => h.placement ? OBJECT_CATALOG[h.placement.type].effect : null;

/** What touching this hazard does to a car at its crossing; legacy entries only ever block. */
export function hazardTouch(h: RaceHazard, car: Car, time: number): { effect: GameplayEffect | null; x: number } {
  const altitude = car.altitude || 0; // traffic and some rivals never leave the road and carry no altitude
  if (!h.placement) {
    const x = hazardX(h, time);
    return { effect: Math.abs(car.x - x) < (h.halfWidth ?? BARRIER_HALF_WIDTH) + 0.25 && altitude < (h.height ?? 2.4) ? 'block' : null, x };
  }
  const frame = hazardFrame(h.placement, time);
  // Probe at the hazard's own distance: a crossing is swept, so no frame rate can tunnel through it.
  return { effect: hazardContact(h.placement, frame, { distance: h.distance, x: car.x, altitude }), x: frame.lateralOffset };
}

/** Non-crash effects shared by every car: gusts shove sideways, rough terrain bleeds speed. */
export function nudge(car: Car, effect: GameplayEffect | null, h: RaceHazard): void {
  if (effect === 'push') car.x = Math.max(-ROAD_LIMIT, Math.min(ROAD_LIMIT, car.x + (h.placement!.seed % 2 ? GUST_SHOVE : -GUST_SHOVE)));
  else if (effect === 'slow') car.speed *= TERRAIN_RETENTION;
}

// Every hazard can be hit or cleared only once. The physics layer decides
// impacts; the renderer only draws the same authored hazards.
export function stepPlayerHazards(race: { hazards: RaceHazard[]; elapsed: number; risk?: RiskRules }, car: PlayerCar, previousDistance: number, contact: Contact): void {
  for (const hazard of race.hazards) {
    if (hazard.distance > car.distance) break;
    if (hazard.distance <= previousDistance || hazard.hit || hazard.passed) continue;
    const { effect, x: obstacleX } = hazardTouch(hazard, car, race.elapsed);
    if (effect === 'block' && car.cooldown === 0) {
      contact(race, 'barrier', obstacleX, 0.7, 0.6);
      hazard.hit = true;
      continue;
    }
    hazard.passed = true;
    nudge(car, effect, hazard);
    if (!effect && (!hazard.placement || hazardReach(hazard))) {
      // Risk/reward: a close, clean ground pass pays more than a distant lane change.
      const near = car.altitude < 2.4 && Math.abs(car.x - obstacleX) < 4;
      car.score += near ? race.risk?.nearScore ?? 300 : race.risk?.passScore ?? 150; // REPLAY-03 ground line
      if (near) car.nearMisses++;
    }
  }
}
