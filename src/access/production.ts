// Bundled in normal development and production builds only.
// All progression checks remain exactly as they were before the local test option.
import { loadUnlocks } from '../history.ts';
import { ownedPaints } from '../appearance.ts';
import { isUpcomingTrack } from '../upcoming-tracks.ts';

// A stale save or accidental runtime merge cannot unlock unreleased covers.
export const availableTracks = () => loadUnlocks().filter(id => !isUpcomingTrack(id));
export const availablePaints = (totalStars: number): string[] => ownedPaints(totalStars);
