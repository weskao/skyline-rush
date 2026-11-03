// LOCAL DEV SERVER ONLY. Vite's alternative config aliases this module into main.js.
// This file is not imported by vite.config.js and must never be shipped in dist/.
// No localStorage writes: switching back to `make` immediately restores real progression.
import { RACE_TRACKS } from '../game.js';
import { raceTrack } from '../race-tracks.ts';
import { PAINTS } from '../appearance.ts';

console.info('SKYLINE_RUSH_DEV_UNLOCK_ALL_ONLY: local development preview; never distribute.');

export const availableTracks = () => Object.keys(RACE_TRACKS);
// A Coming Soon card is enterable here only once its race runtime exists (`raceTrack` resolves it).
export const isUpcomingEnterable = (id: string): boolean => raceTrack(id) !== undefined;
export const availablePaints = () => Object.keys(PAINTS);
