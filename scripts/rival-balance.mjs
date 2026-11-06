// Rival difficulty balance: a scripted player races seven rivals, traffic included, on every track.
// - expert (pickup-economy.mjs botInput): always BOOSTs with fuel to spare, flies for rings, fires every full NITRO.
// - beginner: the same steering and NITRO, but never BOOSTs and never flies for a ring (only over a gap).
// A margin is the fastest rival's finish time minus the player's: positive, the player wins. A place counts the
// rivals home before the player. Run `node scripts/rival-balance.mjs` for the table.
import { pathToFileURL } from 'node:url';
import { createRace, startRace, stepRace, RACE_TRACKS } from '../src/game.js';
import { botInput, median } from './pickup-economy.mjs';

const DT = 1 / 60;
export const PLAYERS = {
  expert: botInput,
  beginner: (race, bot) => { const input = botInput(race, bot); return { ...input, boost: false, fly: input.fly && !bot.climb }; },
};

export function raceResult(trackId, difficulty, player = 'expert') {
  const race = createRace(trackId, { mode: 'custom', rivals: 7, difficulty });
  startRace(race); race.phase = 'racing';
  const bot = { boost: false, climb: false }, input = PLAYERS[player];
  for (let steps = 0; race.phase === 'racing' && steps < 60 * 600; steps++) stepRace(race, input(race, bot), DT);
  // The race ends at the player's finish: a rival still running is timed by its remaining distance at its pace.
  const finish = race.rivals.map(r => r.finishTime ?? race.elapsed + (race.length - r.distance) / Math.max(1, r.pace));
  return { margin: Math.min(...finish) - race.elapsed, place: 1 + finish.filter(t => t < race.elapsed).length };
}
export const raceMargin = (trackId, difficulty) => raceResult(trackId, difficulty).margin;

export function rivalBalance(difficulty, player = 'expert') {
  const results = Object.keys(RACE_TRACKS).map(id => ({ id, ...raceResult(id, difficulty, player) }));
  const margins = results.map(r => r.margin);
  return { difficulty, player, median: median(margins), rivalWins: margins.filter(m => m < 0).length, margins, results };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const player of Object.keys(PLAYERS)) {
    for (const d of ['easy', 'normal', 'hard']) {
      const { median: m, rivalWins, results } = rivalBalance(d, player);
      console.log(player.padEnd(8), d.padEnd(6), 'median', m.toFixed(1), 's  rival wins', `${rivalWins}/${results.length}`, ' ',
        results.map(r => `${r.id} ${r.margin.toFixed(1)} P${r.place}`).join(' | '));
    }
  }
}
