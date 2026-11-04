/**
 * Stage 2 concept tracks. A Coming Soon home card (spread into UPCOMING_TRACKS), never in RACE_TRACKS.
 * `?stage2-preview=<id>[&shot=p01|p02]` opens the card's showroom, Start disabled.
 */
export const STAGE2_TRACKS = Object.freeze({
  'frostbite-canyon': {
    names: { en: 'Frostbite Canyon', 'zh-TW': '極地冰原峽谷' }, length: 13800,
    image: 'track-teasers/frostbite-canyon.jpg', route: 'track-teasers/frostbite-canyon-route.svg',
  },
} as const);

export type Stage2TrackId = keyof typeof STAGE2_TRACKS;
export type Stage2Shot = 'p01' | 'p02';
export const isStage2Track = (id: string): id is Stage2TrackId => Object.hasOwn(STAGE2_TRACKS, id);

export function stage2PreviewRequest(search: string): { id: Stage2TrackId; shot: Stage2Shot } | null {
  const params = new URLSearchParams(search), id = params.get('stage2-preview') ?? '';
  if (!isStage2Track(id)) return null;
  return { id, shot: params.get('shot') === 'p02' ? 'p02' : 'p01' };
}
