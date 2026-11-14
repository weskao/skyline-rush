// Which tracks have a `?look=3d` look (look-gate.ts) and what it is made of. The lighting plan (coast-lighting.ts)
// and the asset host (coast-assets.ts) read this entry, so a track opts in here, not with a second copy of them.
import type { CoastEnvName } from './coast-lighting.ts';

export interface TrackLook {
  /** Race visual preset → HDRI variant; a preset not listed keeps RoomEnvironment. */
  readonly env: Readonly<Record<string, CoastEnvName | undefined>>;
  /** Material-manifest id of the KTX2 road set. */
  readonly road: string;
  /** Road wetness per race visual preset, 0 dry .. 1 soaked; a preset not listed is dry. */
  readonly wetness: Readonly<Record<string, number>>;
  /** Model-manifest id of the close-scenery GLB; while it is drawn the cones, skyline and towers are hidden. */
  readonly scenery?: string;
  readonly boats?: string;
}

const TRACK_LOOKS: Readonly<Record<string, TrackLook>> = {
  coast: { env: { track: 'day', day: 'day', dusk: 'dusk', rain: 'rain', fog: 'fog' }, road: 'coast-asphalt', wetness: { rain: .85, dusk: .35, fog: .25 }, scenery: 'coast-scenery', boats: 'coast-boats' },
  // N2: night and rain night only; `track` is Neon's rainy default (board-effects.ts RAINY_TRACKS).
  neon: { env: { track: 'nightRain', rain: 'nightRain', night: 'night' }, road: 'neon-asphalt', wetness: { track: .85, rain: .85 } },
};

export const trackLook = (trackId: string): TrackLook | undefined => Object.hasOwn(TRACK_LOOKS, trackId) ? TRACK_LOOKS[trackId] : undefined;
