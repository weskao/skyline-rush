// Ring variety vs. collectability across random race seeds: per track, how evenly ring lines use the four lanes and
// both heights, how many trains/rows a race gets, and what share of rings / NITRO the economy bot still takes.
// Run `node scripts/ring-variety.mjs [seeds]` for the table.
import { pathToFileURL } from 'node:url';
import { createRace, setLayoutSeed, RACE_TRACKS, LANES } from '../src/game.js';
import { seededRng } from '../src/rng.ts';
import { measureEconomy } from './pickup-economy.mjs';

const nearestLane = x => LANES.reduce((best, lane, i) => Math.abs(lane - x) < Math.abs(LANES[best] - x) ? i : best, 0);

export function ringVariety(trackId, seeds = 40, bot = true) {
  const lanes = [0, 0, 0, 0], random = seededRng(42, 'ring-variety');
  let lines = 0, ground = 0, trains = 0, rows = 0, rings = 0, taken = 0, nitro = 0, races = 0;
  for (let i = 0; i < seeds; i++) {
    const seed = Math.floor(random() * 2 ** 32);
    setLayoutSeed(() => seed);
    const race = createRace(trackId);
    // A row covers every lane and a train counts once: only the line a driver must pick is counted.
    for (const r of race.rings) if (!r.row && !(r.train > 0)) {
      lines++; lanes[nearestLane(r.x)]++;
      if (r.altitude <= r.radius) ground++;
    }
    trains += race.rings.filter(r => r.train === 0).length;
    rows += new Set(race.rings.filter(r => r.row).map(r => r.distance)).size;
    if (bot) {
      const e = measureEconomy(trackId);
      rings += e.ringsTotal; taken += e.rings; nitro += e.nitroPerMinute; races++;
    }
  }
  setLayoutSeed();
  const pct = v => Math.round(v * 1000) / 10;
  return {
    trackId, lanes: lanes.map(n => pct(n / lines)).join('/'), topLane: pct(Math.max(...lanes) / lines), ground: pct(ground / lines),
    trains: Math.round(trains / seeds * 10) / 10, rows: Math.round(rows / seeds * 10) / 10,
    ...(bot && { taken: pct(taken / rings), nitroPerMinute: Math.round(nitro / races * 100) / 100 }),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const seeds = Number(process.argv[2] ?? 20);
  console.table(Object.keys(RACE_TRACKS).map(id => ringVariety(id, seeds)));
}
