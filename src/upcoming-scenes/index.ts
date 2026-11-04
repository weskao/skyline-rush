import type { UpcomingEnvironmentFactory } from '../upcoming-showcase.ts';
import type { UpcomingTrackId } from '../upcoming-tracks.ts';
import { createUpcomingEnvironment as duneTempest } from './dune-tempest.ts';
import { createUpcomingEnvironment as monsoonRuins } from './monsoon-ruins.ts';
import { createUpcomingEnvironment as skyfallArchipelago } from './skyfall-archipelago.ts';
import { createUpcomingEnvironment as volcanicCrown } from './volcanic-crown.ts';
import { createUpcomingEnvironment as stormlineMegacity } from './stormline-megacity.ts';

// The environments own scenery, never a renderer, cars, camera or race state.
export const UPCOMING_ENVIRONMENTS: Partial<Record<UpcomingTrackId, UpcomingEnvironmentFactory>> = {
  'dune-tempest': duneTempest,
  'monsoon-ruins': monsoonRuins,
  'skyfall-archipelago': skyfallArchipelago,
  'volcanic-crown': volcanicCrown,
  'stormline-megacity': stormlineMegacity,
};
