import type { UpcomingEnvironmentFactory } from '../upcoming-showcase.ts';
import type { UpcomingTrackId } from '../upcoming-tracks.ts';

// Each art branch contributes one verified factory here. Until then the
// explicitly labeled concept fallback is shown instead of fake 3D.
export const UPCOMING_ENVIRONMENTS: Partial<Record<UpcomingTrackId, UpcomingEnvironmentFactory>> = {};
