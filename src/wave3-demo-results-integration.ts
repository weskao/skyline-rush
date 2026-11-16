import { getWave3DemoReceipt } from '#wave3-demo-race';
import { mountWave3DemoResults } from './wave3-demo-results-ui.ts';
import { wave3DemoArtUrl } from './wave3-demo-art.ts';

/** Draw the receipt on the existing results summary; no payouts on language/UI rerenders. */
let renderRevision = 0;
let shownRace: object | undefined;

export async function renderWave3DemoResults(race: { mode: string }, locale: string): Promise<void> {
  const revision = ++renderRevision;
  const container = document.querySelector<HTMLElement>('#race-overlay .overlay-summary');
  if (!container) return;
  const previous = container.querySelector<HTMLElement>('[data-wave3-demo-results]');
  if (previous && shownRace !== race) previous.hidden = true;
  const receipt = await getWave3DemoReceipt(race);
  if (revision !== renderRevision || document.body.dataset.phase !== 'finished') return;
  if (!receipt || receipt.snapshot.mode !== 'local-demo') {
    if (previous) previous.hidden = true;
    return;
  }
  shownRace = race;
  if (previous) previous.hidden = false;
  mountWave3DemoResults({ container, settlement: receipt, locale, raceMode: race.mode,
    artworkUrl: wave3DemoArtUrl('demo-points'),
    bannerUrl: wave3DemoArtUrl('demo-results-banner') });
}
