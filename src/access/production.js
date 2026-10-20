// Bundled in normal development and production builds only.
// All progression checks remain exactly as they were before the local test option.
import { loadUnlocks } from '../history.js';
import { ownedPaints } from '../appearance.js';

export const availableTracks = () => loadUnlocks();
export const availablePaints = totalStars => ownedPaints(totalStars);
