import * as THREE from 'three';
import type { UpcomingEnvironmentFactory } from '../upcoming-showcase.ts';
import { stage2PreviewRequest, type Stage2TrackId } from '../stage2-tracks.ts';
import { createUpcomingEnvironment as frostbiteCanyon } from './frostbite-canyon.ts';

// `@stage2-environments` in dev / VITE_STAGE2_PREVIEW=1 builds only (vite.config.js); production
// resolves stage2-none.ts, so none of this scene code ships.
export const STAGE2_ENVIRONMENTS: Partial<Record<Stage2TrackId, UpcomingEnvironmentFactory>> = {
  'frostbite-canyon': (scene: THREE.Scene) => {
    const environment = frostbiteCanyon(scene);
    environment.setShot(stage2PreviewRequest(location.search)?.shot ?? 'p01');
    return environment;
  },
};
