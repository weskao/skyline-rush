import { MAX_SPEED, BOOST_CAP_BONUS, NITRO_CAP_BONUS, THROTTLE_ACCEL, BOOST_ACCEL, NITRO_ACCEL, OVER_CAP_DECEL, NITRO_TIME,
  FLY_DRAIN, BOOST_DRAIN, GROUND_FUEL_REGEN, UPHILL_FUEL_REGEN, GLIDE_FUEL_REGEN, SLIPSTREAM_CAP_BONUS, SLIPSTREAM_NITRO, inDraft, stepSlipstream,
  type Slipstream } from './drive-rules.ts';
import { NITRO_MAX } from './ring-layout.ts';
import { physicalGap } from './circuit-track.ts';
import { rivalWantsNitro, rivalLevel, type RivalNitroState } from './rival-items.ts';

// How a rival drives (user, 2026-11-07): by the player's own rules — the same caps, acceleration, fuel and
// NITRO and SLIPSTREAM, and no charge at the start. Difficulty is skill only: how close to the cap a rival holds
// its line, how it spends fuel on BOOST, how quickly it changes lane and whether it reads its lane before NITRO.
export interface RivalSkill {
  pace: number; // share of MAX_SPEED the fastest rival holds on the throttle (its line and lift-offs)
  spread: number; // pace each slower grid slot gives up
  boostOn: number; boostOff: number; // fuel hysteresis for BOOST (boostOn above 100: never boosts)
  smart: boolean; // fires NITRO as soon as its lane is clear, instead of at its personality's moment
  laneShift: number; // m/s sideways when avoiding or seeking (car-collisions.js); the player steers up to 9
}
// Tuned with the scripted player bot (scripts/rival-balance.mjs) to the user's 2026-11-07 "challenging" target.
// 'intro' is Easy and Normal on an opening map (TrackConfig.introRivals): a new player mostly finishes on the podium.
export const RIVAL_SKILL: Readonly<Record<string, RivalSkill>> = {
  intro: { pace: 0.92, spread: 0.012, boostOn: 101, boostOff: 100, smart: false, laneShift: 6 },
  easy: { pace: 0.93, spread: 0.012, boostOn: 80, boostOff: 50, smart: false, laneShift: 6 },
  normal: { pace: 0.98, spread: 0.006, boostOn: 40, boostOff: 20, smart: true, laneShift: 8 },
  hard: { pace: 1, spread: 0.003, boostOn: 30, boostOff: 10, smart: true, laneShift: 9 },
};
const SLOTS = 7; // the full grid's rivals; slot 6 is the fastest

interface Car { distance: number; x: number; altitude?: number }
export interface DrivenRival extends RivalNitroState {
  x: number; fuel: number; boosting: boolean; thrusting: boolean; nitroTime: number; cooldown: number; slipstream: Slipstream;
  laneShift?: number; // read by avoidObstacles (car-collisions.js)
}
export interface DriveRace {
  trackId: string; elapsed: number; length: number; rivalPace?: number; config: { difficulty?: string };
  sections: readonly { type: string; from: number; to: number }[];
  player: Car; traffic: readonly Car[]; rivals: readonly Car[];
}

// Frostbite is almost twice a classic sprint's length. Preserve the distinct back/middle/front
// grid pace from its original seven-car tuning; generic skill spreads otherwise let all seven
// BOOST-capable rivals outrun a throttle-only player even with the leading-rival rubber band.
// Other courses and the difficulty-dependent BOOST/NITRO/steering rules keep their defaults.
const FROSTBITE_SKILL: Readonly<Record<string, RivalSkill>> = Object.fromEntries(
  Object.entries(RIVAL_SKILL).map(([level, skill]) => [level, { ...skill, spread: 0.03 }]),
);
export const rivalSkill = (race: Pick<DriveRace, 'trackId' | 'config'>): RivalSkill =>
  (race.trackId === 'frostbite-canyon' ? FROSTBITE_SKILL : RIVAL_SKILL)[rivalLevel(race)] ?? RIVAL_SKILL.normal!;
/** The rival's throttle cap before BOOST or NITRO: never above the player's MAX_SPEED. */
export const rivalBaseCap = (skill: RivalSkill, slot: number): number => MAX_SPEED * Math.min(1, skill.pace - skill.spread * (SLOTS - 1 - slot));

// Nothing within a second's travel on its line: a NITRO fired into a car's tail is a wasted charge.
export function laneClear(race: DriveRace, rival: DrivenRival): boolean {
  const look = rival.speed + 20, altitude = rival.altitude || 0;
  const blocks = (car: Car) => {
    if (car === rival || Math.abs(car.x - rival.x) > 2.4 || Math.abs((car.altitude || 0) - altitude) > 1.8) return false;
    const gap = physicalGap(race.trackId, rival.distance, car.distance);
    return gap > -2 && gap < look;
  };
  return !blocks(race.player) && !race.traffic.some(blocks) && !race.rivals.some(blocks);
}

// Easy keeps each personality's moment (rival-items.ts); Normal and Hard fire a charge as soon as their line is
// clear, as a good player does: a banked charge is time not gained, a charge fired into a tail is wasted.
export function rivalFiresNitro(race: DriveRace, rival: DrivenRival, hop: number, skill: RivalSkill): boolean {
  if (rival.nitro < 1 || rival.nitroTime > 0) return false; // the player's rule: a full charge, one burst at a time
  return skill.smart ? laneClear(race, rival) : rivalWantsNitro(race, rival, hop);
}

/** One step of a rival's throttle, BOOST, NITRO, SLIPSTREAM and fuel, by the player's numbers (game.js stepRace). */
export function driveRival(race: DriveRace, rival: DrivenRival, slot: number, hop: number, dt: number): void {
  const skill = rivalSkill(race);
  rival.laneShift = skill.laneShift;
  const drafts = (car: Car) => car !== rival && inDraft(race.trackId, rival, car);
  if (stepSlipstream(rival.slipstream, drafts(race.player) || race.traffic.some(drafts) || race.rivals.some(drafts), dt)) {
    rival.nitro = Math.min(NITRO_MAX, rival.nitro + SLIPSTREAM_NITRO);
  }
  if (rivalFiresNitro(race, rival, hop, skill)) { rival.nitro--; rival.nitroUses++; rival.nitroTime = NITRO_TIME; }
  const nitro = rival.nitroTime > 0, grounded = !(rival.altitude > 0);
  rival.nitroTime = Math.max(0, rival.nitroTime - dt);
  // No BOOST under NITRO: its cap already covers BOOST's, so the fuel would be wasted.
  rival.boosting = grounded && !nitro && rival.fuel > 0 && (rival.boosting ? rival.fuel > skill.boostOff : rival.fuel >= skill.boostOn);
  // shortcut: the scripted hop still flies on an empty tank (it never strands a rival); upgrade if rivals ever choose when to fly.
  if (rival.thrusting) rival.fuel -= FLY_DRAIN * dt;
  else if (!grounded) rival.fuel += GLIDE_FUEL_REGEN * dt;
  else if (rival.boosting) rival.fuel -= BOOST_DRAIN * dt;
  else rival.fuel += (race.sections.some(s => s.type === 'uphill' && rival.distance >= s.from && rival.distance < s.to) ? UPHILL_FUEL_REGEN : GROUND_FUEL_REGEN) * dt;
  rival.fuel = Math.min(100, Math.max(0, rival.fuel));
  const cap = Math.min(MAX_SPEED, rivalBaseCap(skill, slot) * (race.rivalPace ?? 1)) + (nitro ? NITRO_CAP_BONUS : rival.boosting ? BOOST_CAP_BONUS : 0) +
    (rival.slipstream.active ? SLIPSTREAM_CAP_BONUS : 0);
  const accel = THROTTLE_ACCEL + (rival.boosting ? BOOST_ACCEL : 0) + (nitro ? NITRO_ACCEL : 0);
  rival.speed = rival.speed > cap ? Math.max(cap, rival.speed - OVER_CAP_DECEL * dt) : Math.min(cap, rival.speed + accel * dt);
}
