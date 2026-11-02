// Deterministic Classic pickup economy: a scripted bot drives each track and reports how often
// it can BOOST and NITRO. Run `node scripts/pickup-economy.mjs` for the table.
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';

export const WORLD_TOUR = ['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
export const CLASSIC_FIRST_THREE = ['coast', 'neon', 'canyon'];
const DT = 1 / 60;
const NO_FLY_AHEAD = 200; // m before a tunnel: an airborne car would hit the roof
const BOOST_ON = 40, BOOST_OFF = 20; // fuel hysteresis keeps a reserve for flying to rings and over gaps
const CLIMB_ON = 35, CLIMB_OFF = 5; // fuel hysteresis for flying to a ring: no FLY flicker on the road, which blocks recharge
const GAP_HEIGHT = 3; // m: enough to clear a broken bridge without burning fuel to the ceiling

// Like a player, the bot steers around a car it is closing on: it keeps its aim while that line and its own
// are clear, else takes the nearest lane with no car ahead (within about a second) or alongside. Rivals hop and
// the bot climbs to rings, so a car blocks its lane at any height.
const LANES = [-7.5, -2.5, 2.5, 7.5];
function clearLane(race, aim) {
  const car = race.player, reach = Math.max(30, car.speed);
  const behind = o => 5 + Math.max(0, (o.pace ?? o.speed) - car.speed) * 0.5; // a faster car closing from behind
  const blocked = x => race.rivals.some(o => o.distance - car.distance > -behind(o) && o.distance - car.distance < reach && Math.abs(o.x - x) < 2.4);
  if (!race.rivals.length || (!blocked(aim) && !blocked(car.x))) return aim;
  const free = LANES.filter(x => !blocked(x));
  return free.length ? free.reduce((a, b) => Math.abs(b - aim) < Math.abs(a - aim) ? b : a) : aim;
}

// The bot chases the next ring (else the next pickup), climbs to it, BOOSTs with fuel to spare and
// fires NITRO as soon as a full charge is banked. No brake, so no drift or trick rewards.
export function botInput(race, bot) {
  const car = race.player, at = car.distance;
  const next = race.rings.find(r => !r.hit && r.distance > at + 1 && r.distance < at + 250);
  // A full-width row is passed by any of its rings: aim at the one in the bot's own lane.
  const ring = next?.row === undefined ? next : race.rings.filter(r => r.row === next.row && r.lap === next.lap)
    .reduce((a, b) => Math.abs(b.x - car.x) < Math.abs(a.x - car.x) ? b : a);
  const target = ring ?? race.pickups.find(p => !p.taken && p.tier !== 'overcharge' && p.distance > at + 1 && p.distance < at + 150);
  const tunnelNear = race.sections.some(s => s.type === 'tunnel' && s.to > at && s.from - at < NO_FLY_AHEAD);
  const gapNear = race.sections.some(s => s.type === 'gap' && s.to > at && s.from - at < Math.max(car.speed, 18) * 1.2);
  const reach = ring ? ring.radius - 1 : 1.2; // a target this low is taken from the road: no flight
  const wantAir = !!target && target.altitude > reach && target.distance - at < car.speed * 2.5 && !tunnelNear;
  bot.climb = wantAir && (bot.climb ? car.fuel > CLIMB_OFF : car.fuel >= CLIMB_ON);
  bot.boost = bot.boost ? car.fuel > BOOST_OFF : car.fuel >= BOOST_ON;
  const dx = clearLane(race, target ? target.x : car.x) - car.x;
  return {
    throttle: true, laneAssist: true,
    steer: Math.abs(dx) < 0.2 ? 0 : Math.max(-1, Math.min(1, dx * 0.6)),
    fly: (gapNear && car.altitude < GAP_HEIGHT) || (bot.climb && car.altitude < target.altitude - 0.5),
    boost: bot.boost,
    nitro: car.nitro >= 1 && car.nitroTime === 0,
  };
}

// Traffic is removed so the numbers measure the track's layout, not collisions. Rivals are removed too
// (the stage-1 measurement) unless `rivals: true`, which keeps the mode's grid and counts their NITRO.
// `options` goes to createRace (mode config or a daily modifier id); `cap` bounds the run in seconds
// for modes the bot cannot finish (Checkpoint times out, Elimination never ends without rivals).
export function measureEconomy(trackId, options = undefined, cap = 600, { rivals = false } = {}) {
  const race = createRace(trackId, options);
  startRace(race);
  race.phase = 'racing';
  race.traffic = [];
  if (!rivals) race.rivals = [];
  const car = race.player, bot = { boost: false, climb: false };
  let nitroGained = 0, boostedSteps = 0, steps = 0, fuelEmpty = 0, firstNitro = null, rivalNitro = 0;
  while (race.phase === 'racing' && steps < 60 * cap) {
    const input = botInput(race, bot), nitroBefore = car.nitro, fuelBefore = car.fuel;
    const spent = input.nitro && !car.nitroHeld && car.nitro >= 1 ? 1 : 0;
    const idle = race.rivals.map(r => r.nitroTime === 0);
    stepRace(race, input, DT);
    rivalNitro += race.rivals.filter((r, i) => idle[i] && r.nitroTime > 0).length;
    steps++;
    nitroGained += car.nitro - nitroBefore + spent;
    if (car.boosting || car.miniBoost > 0) boostedSteps++;
    if (fuelBefore > 0 && car.fuel === 0) fuelEmpty++;
    if (firstNitro === null && car.nitro >= 1) firstNitro = race.elapsed;
  }
  const minutes = race.elapsed / 60, round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
  return {
    trackId, phase: race.phase, time: round(race.elapsed, 1), nitroPerMinute: round(nitroGained / minutes),
    boostShare: round(boostedSteps / steps * 100, 1), fuelEmpty, firstNitro: firstNitro === null ? null : round(firstNitro, 1),
    falls: car.falls, collisions: car.collisions, rings: car.rings, ringsTotal: race.rings.length, pickups: race.pickups.filter(p => p.taken).length, pickupsTotal: race.pickups.length,
    rivals: race.rivals.length, rivalNitro, rivalTakes: race.rivals.map(r => r.itemTakes), position: race.result?.position ?? null,
  };
}

// Every mode that draws its rings and pickups from the track (Endless and Event Lab build their own),
// keyed `<mode>/<difficulty>/<track>`. Only Custom exposes a difficulty; the others race on Normal.
const SPRINT_MODES = ['classic', 'free', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'elimination'];
const sprintTracks = Object.keys(RACE_TRACKS);
export const ECONOMY_CASES = [
  ...SPRINT_MODES.flatMap(mode => sprintTracks.map(trackId => ({ mode, difficulty: 'normal', trackId, options: mode === 'classic' ? undefined : { mode } }))),
  ...['easy', 'normal', 'hard'].flatMap(difficulty => sprintTracks.map(trackId => ({ mode: 'custom', difficulty, trackId, options: { mode: 'custom', rivals: 7, difficulty } }))),
  { mode: 'circuit', difficulty: 'normal', trackId: 'harbor-circuit', options: { mode: 'circuit', laps: 3 } },
].map(c => ({ ...c, key: `${c.mode}/${c.difficulty}/${c.trackId}` }));

export const economyMatrix = ({ rivals }) => ECONOMY_CASES.map(c => ({ key: c.key, ...measureEconomy(c.trackId, c.options, 600, { rivals }) }));

export const median = values => {
  const sorted = [...values].sort((a, b) => a - b), mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// World Tour median per metric: the target the first three Classic maps are tuned toward.
export function worldTourBaseline(results = WORLD_TOUR.map(id => measureEconomy(id))) {
  return Object.fromEntries(['nitroPerMinute', 'boostShare', 'firstNitro'].map(key => [key, median(results.map(r => r[key]))]));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href && process.argv.includes('--freeze-stage1')) {
  // One-off, on the stage-1 layout: the rival-free take, today's rival NITRO (car-avoiding bot) and the ring and
  // pickup counts that stage 2 is held against.
  const withRivals = Object.fromEntries(economyMatrix({ rivals: true }).map(r => [r.key, r.rivalNitro]));
  const rows = Object.fromEntries(economyMatrix({ rivals: false }).map(r => [r.key, { nitroPerMinute: r.nitroPerMinute, boostShare: r.boostShare,
    rivalNitro: withRivals[r.key], rings: r.ringsTotal, pickups: r.pickupsTotal }]));
  writeFileSync(new URL('./pickup-economy-stage1.json', import.meta.url), JSON.stringify(rows, null, 1) + '\n');
} else if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const rows = Object.keys(RACE_TRACKS).map(id => measureEconomy(id));
  console.table(rows);
  console.log('World Tour median', worldTourBaseline(rows.filter(r => WORLD_TOUR.includes(r.trackId))));
}
