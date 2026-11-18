import { presentAcquisition, type AcquisitionItem } from './acquisition-reveal.ts';
import { t, trackName, type Locale } from './i18n.ts';
import { demoAcquisitionItems } from './acquisition-demo-items.ts';
import { getWave3DemoReceipt } from '#wave3-demo-race';
import type { Settlement } from './race-results.ts';

const presented = new WeakSet<object>();
let sequence = 0;
const localized = (read: (locale: Locale) => string) => ({ en: read('en'), 'zh-TW': read('zh-TW') });
const medal = (id: string, key: string): AcquisitionItem => ({
  id, kind: 'medal', status: 'earned',
  name: localized(locale => t(key, undefined, locale)),
  description: localized(locale => t(key + '.detail', undefined, locale)),
});

export function raceAcquisitionItems(result: Settlement): AcquisitionItem[] {
  const items: AcquisitionItem[] = [];
  if (result.next && result.unlockedTrack) {
    const id = result.next;
    items.push({ id, kind: 'track', status: 'unlocked', name: localized(locale => trackName(id, locale)),
      artwork: { src: `track-teasers/${id}.jpg`, style: 'cover' } });
  }
  for (const id of result.unlockedPaints) {
    items.push({ id, kind: 'paint', status: 'unlocked', name: localized(locale => t('paint.' + id, undefined, locale)),
      artwork: { src: `feature-assets/garage-public/paint-cards/${id}@3x.webp`, style: 'cover' } });
  }
  return [...items, ...result.medals.map(id => medal(id, 'medal.' + id)),
    ...result.challengeMedals.map(id => medal(id, 'challengeMedal.' + id))];
}

/** Called when the ordinary results are visible, once per real race object. */
export async function presentRaceAcquisitions(race: object, result: Settlement): Promise<void> {
  if (presented.has(race)) return;
  presented.add(race);
  const id = `race:${++sequence}`;
  const items = raceAcquisitionItems(result);
  const receipt = await Promise.resolve(getWave3DemoReceipt(race)).catch(() => null);
  presentAcquisition({ id, items: [...items, ...demoAcquisitionItems(receipt)] });
}
