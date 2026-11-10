// LOCAL DEV SERVER ONLY. Vite's alternative config aliases this module into main.js.
// This file is not imported by vite.config.js and must never be shipped in dist/.
// No localStorage writes: switching back to `make` immediately restores real progression.
import { RACE_TRACKS } from '../game.js';
import { raceTrack } from '../race-tracks.ts';
import { PAINTS } from '../appearance.ts';
import { isUpcomingTrack, upcomingReadiness, UPCOMING_TRACKS, type UpcomingReadiness } from '../upcoming-tracks.ts';
export const ENTERABLE_STAGES: ReadonlySet<UpcomingReadiness> = new Set(['playable', 'ready']);

console.info('SKYLINE_RUSH_DEV_UNLOCK_ALL_ONLY: local development preview; never distribute.');

// A registered runtime does not make concept art or an unfinished course playable.
export const isUpcomingEnterable = (id: string): boolean =>
  ENTERABLE_STAGES.has(upcomingReadiness(id)) && raceTrack(id) !== undefined;
// An accidentally merged runtime stays blocked unless readiness approves it.
export const availableTracks = () => [...Object.keys(RACE_TRACKS).filter(id => !isUpcomingTrack(id)),
  ...Object.keys(UPCOMING_TRACKS).filter(isUpcomingEnterable)];
export const availablePaints = () => Object.keys(PAINTS);
