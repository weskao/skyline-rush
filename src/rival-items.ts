import { RACE_DRIVER_IDS } from './race-grid.ts';

// Rival NITRO and rubber-banding (rivals get RIVAL_NITRO_CHARGES charges, fired by personality).
export const RIVAL_NITRO_CHARGES = 2;
export const RIVAL_NITRO_BONUS = 12; // m/s added to the rival's speed cap during NITRO
export const RIVAL_NITRO_NOVA_FIRST = 8; // NOVA (steady): first charge at this race second...
export const RIVAL_NITRO_NOVA_EVERY = 18; // ...then one every this many seconds
export const RIVAL_NITRO_ORBIT_ALTITUDE = 2; // ORBIT (loves flying): fires in the air, once per hop...
export const RIVAL_NITRO_MIN_SPEED = 60; // ...and only once up to speed (a charge only lifts the cap)
export const RIVAL_NITRO_APEX_FROM = 0.75; // APEX (late surge): fires from this fraction of the race
export const RIVAL_HOP_PERIOD: Readonly<Record<string, number>> = { NOVA: 13, ORBIT: 9, APEX: 13 }; // seconds per hop cycle; shorter = more hops

export interface RivalNitroState { name: string; nitro: number; nitroHop: number; altitude: number; speed: number; distance: number }
export interface RaceClock { elapsed: number; length: number }

// Personality decides when a rival spends a charge (it must have one and no NITRO running).
export function rivalWantsNitro(race: RaceClock, rival: RivalNitroState, hop: number): boolean {
  if (rival.name === 'NOVA') return race.elapsed >= RIVAL_NITRO_NOVA_FIRST + (RIVAL_NITRO_CHARGES - rival.nitro) * RIVAL_NITRO_NOVA_EVERY;
  if (rival.name === 'ORBIT') {
    const fire = rival.altitude > RIVAL_NITRO_ORBIT_ALTITUDE && rival.speed >= RIVAL_NITRO_MIN_SPEED && rival.nitroHop !== hop;
    if (fire) rival.nitroHop = hop;
    return fire;
  }
  if (rival.name === 'APEX') return rival.distance >= race.length * RIVAL_NITRO_APEX_FROM;
  return race.elapsed >= 10 + (RIVAL_NITRO_CHARGES - rival.nitro) * (16 + RACE_DRIVER_IDS.indexOf(rival.name as typeof RACE_DRIVER_IDS[number]));
}
