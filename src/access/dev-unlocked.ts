// LOCAL DEV SERVER ONLY. Vite's alternative config aliases this module into main.js.
// This file is not imported by vite.config.js and must never be shipped in dist/.
// No localStorage writes: switching back to `make` immediately restores real progression.
import { RACE_TRACKS } from '../game.js';
import { raceTrack } from '../race-tracks.ts';
import { PAINTS } from '../appearance.ts';
import { upcomingReadiness } from '../upcoming-tracks.ts';

console.info('SKYLINE_RUSH_DEV_UNLOCK_ALL_ONLY: local development preview; never distribute.');

export const availableTracks = () => Object.keys(RACE_TRACKS);
// A registered runtime does not make concept art or an unfinished course playable.
export const isUpcomingEnterable = (id: string): boolean =>
  upcomingReadiness(id) === 'playable' && raceTrack(id) !== undefined;
export const availablePaints = () => Object.keys(PAINTS);
