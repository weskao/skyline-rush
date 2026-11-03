// Bundled in normal development and production builds only.
// All progression checks remain exactly as they were before the local test option.
import { loadUnlocks } from '../history.ts';
import { ownedPaints } from '../appearance.ts';

export const availableTracks = () => loadUnlocks();
/** Release builds keep every Coming Soon card preview-only until it is removed from UPCOMING_TRACKS. */
export const isUpcomingEnterable = (_id: string): boolean => false;
export const availablePaints = (totalStars: number): string[] => ownedPaints(totalStars);
