/** AIR → ROAD CHAIN landing rule, shared by the engine and the practice coach. */
export const CHAIN_POWERED_SECONDS = 0.4;
// User, 2026-11-07: chains were too hard to land. An unpowered glide from the 12 m ceiling
// touches down at ~13 m/s and still counts; only a FLY-held fall on empty fuel is too hard.
export const CHAIN_HARD_LANDING = 14;
interface ChainCar { poweredFlightTime: number; flightBoosted: boolean; verticalSpeed: number; speed: number }
export const earnsAirChain = (car: ChainCar, minSpeed: number): boolean =>
  car.poweredFlightTime >= CHAIN_POWERED_SECONDS && car.flightBoosted &&
  Math.abs(car.verticalSpeed) < CHAIN_HARD_LANDING && car.speed >= minSpeed;
