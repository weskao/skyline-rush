import { STAGE2_TRACKS, isStage2Track, type Stage2TrackId } from './stage2-tracks.ts';

/** Stage 1 concept-only tracks. Do not add these IDs to the simulation race registry. */
export const UPCOMING_TRACKS = Object.freeze({
  'dune-tempest': {
    names: { en: 'Dune Tempest', 'zh-TW': '沙暴裂谷' }, length: 13500,
    image: 'track-teasers/dune-tempest.jpg', route: 'track-teasers/dune-tempest-route.svg',
  },
  'monsoon-ruins': {
    names: { en: 'Monsoon Ruins', 'zh-TW': '雨林失落神殿' }, length: 12500,
    image: 'track-teasers/monsoon-ruins.jpg', route: 'track-teasers/monsoon-ruins-route.svg',
  },
  'skyfall-archipelago': {
    names: { en: 'Skyfall Archipelago', 'zh-TW': '浮空群島' }, length: 16000,
    image: 'track-teasers/skyfall-archipelago.jpg', route: 'track-teasers/skyfall-archipelago-route.svg',
  },
  'volcanic-crown': {
    names: { en: 'Volcanic Crown', 'zh-TW': '熔火天脊' }, length: 15000,
    image: 'track-teasers/volcanic-crown.jpg', route: 'track-teasers/volcanic-crown-route.svg',
  },
  'stormline-megacity': {
    names: { en: 'Stormline Megacity', 'zh-TW': '霓虹暴雨都市' }, length: 14000,
    image: 'track-teasers/stormline-megacity.jpg', route: 'track-teasers/stormline-megacity-route.svg',
  },
} as const);

export type UpcomingTrackId = keyof typeof UPCOMING_TRACKS;
/** Any preview-only Coming Soon id: a Stage 1 card or a gated Stage 2 preview. */
export type PreviewTrackId = UpcomingTrackId | Stage2TrackId;
export type HomeTrackStatus = 'coming-soon' | 'locked' | 'unlocked';
export const isUpcomingTrack = (id: string): id is UpcomingTrackId => Object.hasOwn(UPCOMING_TRACKS, id);
export const upcomingTrackInfo = (id: PreviewTrackId) =>
  isStage2Track(id) ? STAGE2_TRACKS[id] : UPCOMING_TRACKS[id];
export const upcomingTrackName = (id: PreviewTrackId, locale: string): string =>
  upcomingTrackInfo(id).names[locale === 'zh-TW' ? 'zh-TW' : 'en'];
export function homeTrackStatus(id: string, unlocked: ReadonlySet<string>): HomeTrackStatus {
  return isUpcomingTrack(id) ? 'coming-soon' : unlocked.has(id) ? 'unlocked' : 'locked';
}
