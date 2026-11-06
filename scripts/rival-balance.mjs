// Rival difficulty balance: the scripted player bot (pickup-economy.mjs: always BOOSTs with fuel to spare and fires
// every full NITRO charge) races seven rivals, traffic included, on every track. A margin is the fastest rival's
// finish time minus the bot's: positive, the bot wins. Run `node scripts/rival-balance.mjs` for the table.
import { pathToFileURL } from 'node:url';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { botInput, median } from './pickup-economy.mjs';

const DT = 1 / 60;
export function raceMargin(trackId, difficulty) {
  const race = createRace(trackId, { mode: 'custom', rivals: 7, difficulty });
  startRace(race); race.phase = 'racing';
  const bot = { boost: false, climb: false };
  for (let steps = 0; race.phase === 'racing' && steps < 60 * 600; steps++) stepRace(race, botInput(race, bot), DT);
  // The race ends at the bot's finish: a rival still running is timed by its remaining distance at its pace.
  const best = Math.min(...race.rivals.map(r => r.finishTime ?? race.elapsed + (race.length - r.distance) / Math.max(1, r.pace)));
  return best - race.elapsed;
}

export function rivalBalance(difficulty) {
  const margins = Object.keys(RACE_TRACKS).map(id => raceMargin(id, difficulty));
  return { difficulty, median: median(margins), rivalWins: margins.filter(m => m < 0).length, margins };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const d of ['easy', 'normal', 'hard']) {
    const { median: m, rivalWins, margins } = rivalBalance(d);
    console.log(d.padEnd(6), 'median', m.toFixed(1), 's  rival wins', `${rivalWins}/${margins.length}`, ' ', margins.map(x => x.toFixed(1)).join(' '));
  }
}
