// The player's pickup take: which items the car crosses or pulls in this step, and the NITRO each one pays.
// Rivals take items through rival-items.ts; the reward accounting itself (addNitro) stays in game.js.
import { NITRO_MAX, NITRO_PICKUPS } from './ring-layout.ts';
import { ITEM_RESPAWN } from './rival-items.ts';

export const MAGNET_RANGE = 12; // m

interface TakeItem { distance: number; x: number; altitude: number; tier: string; taken?: boolean; downUntil?: number }
interface TakeCar { distance: number; x: number; altitude: number; nitro: number; fuel: number; effects: { magnet: number }; pickup: PickupEvent | null }
/** The player's latest take, a new object each time: the HUD, haptics and camera react to it. `fuel` is what it added. */
export interface PickupEvent { tier: string; fuel: number; time: number }
type AddNitro<C> = (car: C, amount: number, fuelBonus?: number) => void;

export function takePickups<C extends TakeCar>(race: { elapsed: number; pickups: TakeItem[] }, car: C, previousDistance: number, addNitro: AddNitro<C>): void {
  for (const pickup of race.pickups) { // sorted by distance
    if (pickup.distance > car.distance + MAGNET_RANGE) break;
    if (pickup.taken || (pickup.downUntil ?? -Infinity) > race.elapsed) continue; // gone: another car took it (respawns)
    const crossed = pickup.distance <= car.distance && pickup.distance > previousDistance &&
      Math.abs(pickup.x - car.x) < 1.7 && Math.abs(pickup.altitude - car.altitude) < 1.8;
    const pulled = car.effects.magnet > 0 &&
      Math.hypot(pickup.distance - car.distance, pickup.x - car.x, pickup.altitude - car.altitude) < MAGNET_RANGE;
    if (crossed || pulled) {
      pickup.taken = true; pickup.downUntil = race.elapsed + ITEM_RESPAWN;
      const fuel = car.fuel;
      if (pickup.tier === 'overcharge') addNitro(car, NITRO_MAX - car.nitro, 0);
      else addNitro(car, NITRO_PICKUPS[pickup.tier]!);
      car.pickup = { tier: pickup.tier, fuel: car.fuel - fuel, time: race.elapsed };
    }
  }
}
