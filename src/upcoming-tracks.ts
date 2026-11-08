import { STAGE2_TRACKS } from './stage2-tracks.ts';

/** Coming Soon home cards (Stage 1 five + Frostbite Canyon). Do not add these IDs to the simulation race registry. */
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
  'frostbite-canyon': STAGE2_TRACKS['frostbite-canyon'],
} as const);

// Covers are not race runtimes. Release promotion is separate from branch integration.
export type UpcomingTrackId = keyof typeof UPCOMING_TRACKS;
/** Any Coming Soon card; entry is independently gated by readiness and build mode. */
export type PreviewTrackId = UpcomingTrackId;
export type HomeTrackStatus = 'coming-soon' | 'locked' | 'unlocked';
export const isUpcomingTrack = (id: string): id is UpcomingTrackId => Object.hasOwn(UPCOMING_TRACKS, id);
/**
 * A concept/preview is NEVER evidence of a playable race. Missing entries fail closed.
 * Only promote a course to 'playable' after its real driving, finish and regression gates.
 * Production still keeps all UPCOMING_TRACKS as COMING SOON until explicit release promotion.
 */
export type UpcomingReadiness = 'preview' | 'development' | 'playable';
const UPCOMING_READINESS: Readonly<Partial<Record<UpcomingTrackId, Exclude<UpcomingReadiness, 'preview'>>>> = Object.freeze({
  'frostbite-canyon': 'playable',
  'dune-tempest': 'playable',
  'skyfall-archipelago': 'playable',
});
export const upcomingReadiness = (id: string): UpcomingReadiness =>
  isUpcomingTrack(id) ? UPCOMING_READINESS[id] ?? 'preview' : 'preview';

export const upcomingTrackInfo = (id: PreviewTrackId) => UPCOMING_TRACKS[id];
export const upcomingTrackName = (id: PreviewTrackId, locale: string): string =>
  upcomingTrackInfo(id).names[locale === 'zh-TW' ? 'zh-TW' : 'en'];
export function homeTrackStatus(id: string, unlocked: ReadonlySet<string>): HomeTrackStatus {
  return isUpcomingTrack(id) ? 'coming-soon' : unlocked.has(id) ? 'unlocked' : 'locked';
}
