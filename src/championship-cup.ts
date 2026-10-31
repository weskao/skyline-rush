import { RACE_TRACKS } from './game.js';
import { RACE_DRIVER_IDS, reversedGrid } from './race-grid.ts';

export interface CupHeat { track: string; time: number; order: string[]; times: Record<string, number> }
export interface CupState { tracks: string[]; results: CupHeat[] }
interface CupRace {
  trackId: string; phase: string; result?: { time: number } | null;
  elapsed: number; length: number;
  rivals: { name: string; finishTime?: number | null; distance: number; speed: number }[];
}

// Legacy v1 Cups have four drivers; newly started Cups have eight.
const LEGACY = RACE_DRIVER_IDS.slice(0, 4);
const EIGHT = RACE_DRIVER_IDS;
const LEGACY_POINTS = [10, 7, 5, 3];
const EIGHT_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];

export function createCup(unlocked: string[], startingTrack: string, count: number = 3): CupState {
  if (!Array.isArray(unlocked) || new Set(unlocked).size !== unlocked.length ||
    unlocked.some(id => !Object.hasOwn(RACE_TRACKS, id)) || ![3, 5].includes(count) ||
    unlocked.length < count || !unlocked.includes(startingTrack)) throw new RangeError('Cup requires unlocked courses');
  const start = unlocked.indexOf(startingTrack);
  return { tracks: Array.from({ length: count }, (_, i) => unlocked[(start + i) % unlocked.length]), results: [] };
}

function roster(cup: CupState): readonly string[] {
  const names = cup.results[0]?.order;
  return names?.length === 4 ? LEGACY : EIGHT;
}

// Validate saved history before awarding new points or recovering the next heat.
function assertCupStandings(cup: CupState): void {
  const tracks = Array.isArray(cup?.tracks) && [3, 5].includes(cup.tracks.length) &&
    new Set(cup.tracks).size === cup.tracks.length && cup.tracks.every(track => Object.hasOwn(RACE_TRACKS, track));
  if (!tracks || !Array.isArray(cup.results) || cup.results.length > cup.tracks.length)
    throw new RangeError('Invalid Cup standings');
  const names = roster(cup);
  for (const [index, result] of cup.results.entries()) {
    if (result?.track !== cup.tracks[index] || !Number.isFinite(result.time) || result.time <= 0 ||
      !Array.isArray(result.order) || result.order.length !== names.length ||
      new Set(result.order).size !== names.length ||
      names.some(name => !result.order.includes(name) || !Number.isFinite(result.times?.[name]) || result.times[name] <= 0) ||
      result.times.YOU !== result.time) throw new RangeError('Invalid Cup standings');
  }
}

export function addCupResult(cup: CupState, race: CupRace): CupState {
  assertCupStandings(cup);
  const count = race?.rivals?.length;
  const names = count === 3 ? LEGACY : count === 7 ? EIGHT : null;
  const previous = cup.results[0]?.order.length;
  const raceTime = race?.result?.time;
  if (!names || (previous !== undefined && previous !== names.length) ||
    race?.trackId !== cup.tracks[cup.results.length] || race.phase !== 'finished' ||
    typeof raceTime !== 'number' || !Number.isFinite(raceTime) || raceTime <= 0 ||
    !Array.isArray(race.rivals) ||
    new Set(race.rivals.map(r => r.name)).size !== count ||
    names.slice(1).some(name => !race.rivals.some(r => r.name === name)))
    throw new RangeError('Invalid completed Cup heat');
  const drivers = [{ name: 'YOU', time: raceTime }, ...race.rivals.map(r => ({
    name: r.name,
    time: typeof r.finishTime === 'number' && Number.isFinite(r.finishTime) && r.finishTime > 0 ? r.finishTime :
      race.elapsed + Math.max(0, race.length - r.distance) / Math.max(1, r.speed),
  }))];
  if (drivers.some(driver => !Number.isFinite(driver.time) || driver.time <= 0))
    throw new RangeError('Invalid completed Cup heat');
  drivers.sort((a, b) => a.time - b.time || a.name.localeCompare(b.name));
  return { tracks: cup.tracks, results: [...cup.results, {
    track: race.trackId, time: raceTime, order: drivers.map(x => x.name),
    times: Object.fromEntries(drivers.map(x => [x.name, x.time])),
  }] };
}

export function cupStandings(cup: CupState) {
  assertCupStandings(cup);
  const names = roster(cup), points = names.length === 4 ? LEGACY_POINTS : EIGHT_POINTS;
  return names.map(name => ({
    name,
    points: cup.results.reduce((sum, r) => sum + points[r.order.indexOf(name)]!, 0),
    time: cup.results.reduce((sum, r) => sum + r.times[name], 0),
  })).sort((a, b) => b.points - a.points || a.time - b.time || a.name.localeCompare(b.name));
}

export function nextCupGrid(cup: CupState): string[] | null {
  assertCupStandings(cup);
  return cup.results.length ? reversedGrid(cup.results[cup.results.length - 1].order) : null;
}
export const cupComplete = (cup: CupState): boolean => { assertCupStandings(cup); return cup.results.length === cup.tracks.length; };
export const cupTotalTime = (cup: CupState): number => { assertCupStandings(cup); return cup.results.reduce((t, r) => t + r.time, 0); };
