// LOCAL DEV SERVER ONLY. Vite's alternative config aliases this module into main.js.
// This file is not imported by vite.config.js and must never be shipped in dist/.
// No localStorage writes: switching back to `make` immediately restores real progression.
import { RACE_TRACKS } from '../game.js';
import { PAINTS } from '../appearance.ts';
import { isPlayablePreview, isUpcomingTrack } from '../upcoming-tracks.ts';

console.info('SKYLINE_RUSH_DEV_UNLOCK_ALL_ONLY: local development preview; never distribute.');

// Catalog presence is NOT release or readiness approval: only an approved playable preview with a real runtime passes.
export const availableTracks = () => Object.keys(RACE_TRACKS).filter(id => !isUpcomingTrack(id) || isPlayablePreview(id));
export const availablePaints = () => Object.keys(PAINTS);
