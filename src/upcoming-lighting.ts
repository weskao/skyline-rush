import type { DirectionalLight, HemisphereLight, WebGLRenderer } from 'three';
import { COAST_LIGHTING } from './coast-visuals.ts';
import { isUpcomingTrack, type UpcomingTrackId } from './upcoming-tracks.ts';

// Keep broad diffuse light for the road and silhouette. Bloom is reserved for
// small HDR cues such as rings, rail lights and thrusters.
const RACE_LIGHTS = {
  'dune-tempest': { sun: 1.35, fill: 1.2, exposure: .96 },
  'monsoon-ruins': { sun: .72, fill: 1.3, exposure: .97 },
  'skyfall-archipelago': { sun: 1.25, fill: 1.15, exposure: .94 },
  'volcanic-crown': { sun: 1.05, fill: 1.45, exposure: 1 },
  'stormline-megacity': { sun: .72, fill: 1.2, exposure: 1 },
  'frostbite-canyon': { sun: .9, fill: 1.25, exposure: .96 },
} satisfies Record<UpcomingTrackId, { sun: number; fill: number; exposure: number }>;

export const upcomingRaceLighting = (id: string) => isUpcomingTrack(id) ? RACE_LIGHTS[id] : undefined;

export function applyTrackLighting(id: string, upcoming: ReturnType<typeof upcomingRaceLighting>, tour: boolean, sunColor: string,
  sun: DirectionalLight, ambient: HemisphereLight, renderer: Pick<WebGLRenderer, 'toneMappingExposure'>): void {
  const coast = id === 'coast';
  sun.color.set(sunColor);
  sun.intensity = upcoming?.sun ?? (tour ? .75 : coast ? COAST_LIGHTING.sun : id === 'neon' ? .8 : id === 'aurora' ? 1.2 : 2.3);
  sun.position.set(tour ? -400 : -170, tour ? 230 : 100, tour ? 260 : -190);
  renderer.toneMappingExposure = upcoming?.exposure ?? (tour ? .86 : coast ? COAST_LIGHTING.exposure : 1.12);
  ambient.intensity = upcoming?.fill ?? (tour ? (id === 'cosmic' ? .62 : .98) : coast ? COAST_LIGHTING.ambient : id === 'neon' ? 1.1 : 1.7);
}

export const UPCOMING_BLOOM_THRESHOLD = 1.65;
export const UPCOMING_HOME_BLOOM = .07;
export const upcomingRaceBloom = (boostGlow: number) => .09 + Math.min(.09, boostGlow * .4);

export function configureBloom(pass: { enabled: boolean; strength: number; threshold: number },
  quality: string, strength: number, threshold: number): void {
  pass.enabled = quality !== 'low';
  pass.strength = strength;
  pass.threshold = threshold;
}
