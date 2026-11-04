// Bundled in normal development and production builds only.
// All progression checks remain exactly as they were before the local test option.
import { loadUnlocks } from '../history.ts';
import { ownedPaints } from '../appearance.ts';
import { isUpcomingTrack } from '../upcoming-tracks.ts';

// Even merged catalogs and stale progression saves must not release preview-only maps.
export const availableTracks = () => loadUnlocks().filter(id => !isUpcomingTrack(id));
/** Release builds keep every Coming Soon card preview-only until it is removed from UPCOMING_TRACKS. */
export const isUpcomingEnterable = (_id: string): boolean => false;
export const availablePaints = (totalStars: number): string[] => ownedPaints(totalStars);
