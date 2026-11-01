// Deterministic Classic pickup economy: a scripted bot drives each track and reports how often
// it can BOOST and NITRO. Run `node scripts/pickup-economy.mjs` for the table.
import { pathToFileURL } from 'node:url';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';

export const WORLD_TOUR = ['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
export const CLASSIC_FIRST_THREE = ['coast', 'neon', 'canyon'];
const DT = 1 / 60;
const NO_FLY_AHEAD = 200; // m before a tunnel: an airborne car would hit the roof
const BOOST_ON = 40, BOOST_OFF = 20; // fuel hysteresis keeps a reserve for flying to rings and over gaps
const CLIMB_ON = 35, CLIMB_OFF = 5; // fuel hysteresis for flying to a ring: no FLY flicker on the road, which blocks recharge
const GAP_HEIGHT = 3; // m: enough to clear a broken bridge without burning fuel to the ceiling

// The bot chases the next ring (else the next pickup), climbs to it, BOOSTs with fuel to spare and
// fires NITRO as soon as a full charge is banked. No brake, so no drift or trick rewards.
function botInput(race, bot) {
  const car = race.player, at = car.distance;
  const ring = race.rings.find(r => !r.hit && r.distance > at + 1 && r.distance < at + 250);
  const target = ring ?? race.pickups.find(p => !p.taken && p.tier !== 'overcharge' && p.distance > at + 1 && p.distance < at + 150);
  const tunnelNear = race.sections.some(s => s.type === 'tunnel' && s.to > at && s.from - at < NO_FLY_AHEAD);
  const gapNear = race.sections.some(s => s.type === 'gap' && s.to > at && s.from - at < Math.max(car.speed, 18) * 1.2);
  const reach = ring ? ring.radius - 1 : 1.2; // a target this low is taken from the road: no flight
  const wantAir = !!target && target.altitude > reach && target.distance - at < car.speed * 2.5 && !tunnelNear;
  bot.climb = wantAir && (bot.climb ? car.fuel > CLIMB_OFF : car.fuel >= CLIMB_ON);
  bot.boost = bot.boost ? car.fuel > BOOST_OFF : car.fuel >= BOOST_ON;
  const dx = target ? target.x - car.x : 0;
  return {
    throttle: true, laneAssist: true,
    steer: Math.abs(dx) < 0.2 ? 0 : Math.max(-1, Math.min(1, dx * 0.6)),
    fly: (gapNear && car.altitude < GAP_HEIGHT) || (bot.climb && car.altitude < target.altitude - 0.5),
    boost: bot.boost,
    nitro: car.nitro >= 1 && car.nitroTime === 0,
  };
}

// Traffic and rivals are removed so the numbers measure the track's layout, not collisions.
export function measureEconomy(trackId) {
  const race = createRace(trackId);
  startRace(race);
  race.phase = 'racing';
  race.traffic = []; race.rivals = [];
  const car = race.player, bot = { boost: false, climb: false };
  let nitroGained = 0, boostedSteps = 0, steps = 0, fuelEmpty = 0, firstNitro = null;
  while (race.phase === 'racing' && steps < 60 * 600) {
    const input = botInput(race, bot), nitroBefore = car.nitro, fuelBefore = car.fuel;
    const spent = input.nitro && !car.nitroHeld && car.nitro >= 1 ? 1 : 0;
    stepRace(race, input, DT);
    steps++;
    nitroGained += car.nitro - nitroBefore + spent;
    if (car.boosting || car.miniBoost > 0) boostedSteps++;
    if (fuelBefore > 0 && car.fuel === 0) fuelEmpty++;
    if (firstNitro === null && car.nitro >= 1) firstNitro = race.elapsed;
  }
  if (race.phase !== 'finished') throw new Error(`${trackId}: bot did not finish`);
  const minutes = race.elapsed / 60, round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
  return {
    trackId, time: round(race.elapsed, 1), nitroPerMinute: round(nitroGained / minutes),
    boostShare: round(boostedSteps / steps * 100, 1), fuelEmpty, firstNitro: firstNitro === null ? null : round(firstNitro, 1),
    falls: car.falls, collisions: car.collisions, rings: car.rings, ringsTotal: race.rings.length, pickups: race.pickups.filter(p => p.taken).length,
  };
}

export const median = values => {
  const sorted = [...values].sort((a, b) => a - b), mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// World Tour median per metric: the target the first three Classic maps are tuned toward.
export function worldTourBaseline(results = WORLD_TOUR.map(measureEconomy)) {
  return Object.fromEntries(['nitroPerMinute', 'boostShare', 'firstNitro'].map(key => [key, median(results.map(r => r[key]))]));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const rows = Object.keys(RACE_TRACKS).map(measureEconomy);
  console.table(rows);
  console.log('World Tour median', worldTourBaseline(rows.filter(r => WORLD_TOUR.includes(r.trackId))));
}
