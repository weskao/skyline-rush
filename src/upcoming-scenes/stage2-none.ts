import type { UpcomingEnvironmentFactory } from '../upcoming-showcase.ts';
import type { Stage2TrackId } from '../stage2-tracks.ts';

// Production resolution of `@stage2-environments`: no Stage 2 scene code ships until its release gate.
export const STAGE2_ENVIRONMENTS: Partial<Record<Stage2TrackId, UpcomingEnvironmentFactory>> = {};
