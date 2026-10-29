// The player's crossings of race.hazards, resolved by the pure simulation.
import { hazardX, type Hazard } from './hazards.ts';

type RaceHazard = Hazard & { halfWidth?: number; height?: number };
interface PlayerCar { distance: number; x: number; altitude: number; cooldown: number; score: number; nearMisses: number }
type Contact = (race: unknown, kind: 'barrier', obstacleX: number, intensity: number, retention: number) => void;

const BARRIER_HALF_WIDTH = 1.55; // drawn gauntlet barrier: 3.1 m wide

// Every gauntlet barrier can be hit or cleared only once. The physics layer
// decides impacts; the renderer only draws the same authored hazards.
export function stepPlayerHazards(race: { hazards: RaceHazard[]; elapsed: number }, car: PlayerCar, previousDistance: number, contact: Contact): void {
  for (const hazard of race.hazards) {
    if (hazard.distance > car.distance) break;
    if (hazard.distance <= previousDistance || hazard.hit || hazard.passed) continue;
    const obstacleX = hazardX(hazard, race.elapsed);
    const collision = Math.abs(car.x - obstacleX) < (hazard.halfWidth ?? BARRIER_HALF_WIDTH) + 0.25 && car.altitude < (hazard.height ?? 2.4);
    if (collision && car.cooldown === 0) {
      contact(race, 'barrier', obstacleX, 0.7, 0.6);
      hazard.hit = true;
    } else {
      hazard.passed = true;
      if (!collision) {
        // Risk/reward: a close, clean ground pass pays more than a distant lane change.
        const near = car.altitude < 2.4 && Math.abs(car.x - obstacleX) < 4;
        car.score += near ? 300 : 150;
        if (near) car.nearMisses++;
      }
    }
  }
}
