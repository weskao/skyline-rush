/** Six concept-only Coming Soon tracks; keep out of the simulation race registry. */
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
  'frostbite-canyon': {
    names: { en: 'Frostbite Canyon', 'zh-TW': '極地冰原峽谷' }, length: 13800,
    image: 'track-teasers/frostbite-canyon.jpg', route: 'track-teasers/frostbite-canyon-route.svg',
  },
} as const);

// Covers are not race runtimes. Release promotion is separate from branch integration.
export type UpcomingTrackId = keyof typeof UPCOMING_TRACKS;
export type HomeTrackStatus = 'coming-soon' | 'locked' | 'unlocked';
export const isUpcomingTrack = (id: string): id is UpcomingTrackId => Object.hasOwn(UPCOMING_TRACKS, id);
export const upcomingTrackName = (id: UpcomingTrackId, locale: string): string =>
  UPCOMING_TRACKS[id].names[locale === 'zh-TW' ? 'zh-TW' : 'en'];
export function homeTrackStatus(id: string, unlocked: ReadonlySet<string>): HomeTrackStatus {
  return isUpcomingTrack(id) ? 'coming-soon' : unlocked.has(id) ? 'unlocked' : 'locked';
}
