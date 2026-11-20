import { ACQUISITION_KIND, presentAcquisition, type AcquisitionItem } from './acquisition-reveal.ts';
import { t, trackName, type Locale } from './i18n.ts';
import { demoAcquisitionItems } from './acquisition-demo-items.ts';
import { getWave3DemoReceipt } from '#wave3-demo-race';
import { playResultFeedback, type PlayCue, type RaceOutcome } from './result-audio.ts';
import type { Settlement } from './race-results.ts';
import { carArtwork } from './car-catalog.ts';

const presented = new WeakSet<object>();
let sequence = 0;
const localized = (read: (locale: Locale) => string) => ({ en: read('en'), 'zh-TW': read('zh-TW') });
const medal = (id: string, key: string): AcquisitionItem => ({
  id, kind: ACQUISITION_KIND.MEDAL, status: 'earned',
  name: localized(locale => t(key, undefined, locale)),
  description: localized(locale => t(key + '.detail', undefined, locale)),
});

export function raceAcquisitionItems(result: Settlement, openTrack?: (id: string) => void): AcquisitionItem[] {
  const items: AcquisitionItem[] = result.unlockedCars.map(id => ({
    id, kind: ACQUISITION_KIND.CAR, status: 'unlocked', name: localized(locale => t('car.' + id, undefined, locale)),
    artwork: { src: carArtwork(id), style: 'cutout' },
  }));
  if (result.next && result.unlockedTrack) {
    const id = result.next;
    items.push({ id, kind: ACQUISITION_KIND.TRACK, status: 'unlocked', name: localized(locale => trackName(id, locale)),
      artwork: { src: `track-teasers/${id}.jpg`, style: 'cover' },
      action: openTrack && { kind: 'track', open: () => openTrack(id) } });
  }
  for (const id of result.unlockedPaints) {
    items.push({ id, kind: ACQUISITION_KIND.PAINT, status: 'unlocked', name: localized(locale => t('paint.' + id, undefined, locale)),
      artwork: { src: `feature-assets/garage-public/paint-cards/${id}@3x.webp`, style: 'cover' } });
  }
  return [...items, ...result.medals.map(id => medal(id, 'medal.' + id)),
    ...result.challengeMedals.map(id => medal(id, 'challengeMedal.' + id))];
}

/** Called when the ordinary results are visible, once per real race object. */
export async function presentRaceAcquisitions(
  race: RaceOutcome, result: Settlement, cue: PlayCue, instantReveal: boolean, openTrack?: (id: string) => void,
): Promise<void> {
  if (presented.has(race)) return;
  presented.add(race);
  const id = `race:${++sequence}`;
  const items = raceAcquisitionItems(result, openTrack);
  const receipt = await Promise.resolve(getWave3DemoReceipt(race)).catch(() => null);
  const queued = presentAcquisition({ id, items: [...items, ...demoAcquisitionItems(receipt)] });
  // Comfortable presentation can reach results in the same frame as the race finish cue.
  playResultFeedback(cue, race, result, receipt, instantReveal ? .8 : .18, queued);
}
