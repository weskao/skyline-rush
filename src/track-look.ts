// Which tracks have dedicated materials and scenery at Medium and above. The lighting plan (coast-lighting.ts)
// and the asset host (coast-assets.ts) read this entry, so a track opts in here, not with a second copy of them.
import type { CoastEnvName } from './coast-lighting.ts';
import type { VfxQuality } from './vfx-settings.ts';

export interface TrackLook {
  /** Race visual preset → HDRI variant; a preset not listed keeps RoomEnvironment. */
  readonly env: Readonly<Record<string, CoastEnvName | undefined>>;
  /** Material-manifest id of the KTX2 road set on the classic road mesh; none on a course that draws its own road. */
  readonly road?: string;
  /** Material-manifest id of the KTX2 road set on the helix course's own ribbon (spiral-look.ts). */
  readonly helix?: string;
  /** Road wetness per race visual preset, 0 dry .. 1 soaked; a preset not listed is dry. */
  readonly wetness: Readonly<Record<string, number>>;
  /** Model-manifest id of the close-scenery GLB; while it is drawn the cones, skyline and towers are hidden. */
  readonly scenery?: string;
  readonly boats?: string;
  /** Model-manifest id of the landmark kit: drawn with a kit `scenery` (neon-scenery.ts), or on its own on the helix
   *  course (spiral-scenery.ts). */
  readonly landmarks?: string;
  /** Material-manifest id of the KTX2 set on the kit's land (neon-scenery.ts): the road's shader, tier and wetness. */
  readonly ground?: string;
}

const TRACK_LOOKS: Readonly<Record<string, TrackLook>> = {
  coast: { env: { track: 'day', day: 'day', dusk: 'dusk', rain: 'rain', fog: 'fog' }, road: 'coast-asphalt', wetness: { rain: .85, dusk: .35, fog: .25 }, scenery: 'coast-scenery', boats: 'coast-boats' },
  // N2: night and rain night only; `track` is Neon's rainy default (board-effects.ts RAINY_TRACKS).
  neon: { env: { track: 'nightRain', rain: 'nightRain', night: 'night' }, road: 'neon-asphalt', wetness: { track: .85, rain: .85 }, scenery: 'neon-city', landmarks: 'neon-landmarks', ground: 'neon-pavement' },
  // Task 8c: a clear day above the clouds on the default and `day` (owner decision 2026-11-19); the other presets keep
  // the violet night. Coast's day sky, Neon's asphalt set, always dry; the kit and the road set on every preset.
  spiral: { env: { track: 'day', day: 'day' }, helix: 'neon-asphalt', wetness: {}, landmarks: 'spiral-landmarks' },
};

export const trackLook = (trackId: string): TrackLook | undefined => Object.hasOwn(TRACK_LOOKS, trackId) ? TRACK_LOOKS[trackId] : undefined;

/** Shared quality gate for the detailed look of any registered track. */
export const detailedTrackLook = (trackId: string, quality: VfxQuality): TrackLook | undefined =>
  quality === 'low' ? undefined : trackLook(trackId);
