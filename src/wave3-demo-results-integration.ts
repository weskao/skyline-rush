import { getWave3DemoReceipt } from '#wave3-demo-race';
import { mountWave3DemoResults } from './wave3-demo-results-ui.ts';
import { wave3DemoArtUrl } from './wave3-demo-art.ts';

/** Draw the receipt on the existing results summary; no payouts on language/UI rerenders. */
export function renderWave3DemoResults(race: { mode: string }, locale: string): void {
  const receipt = getWave3DemoReceipt(race);
  if (!receipt || receipt.snapshot.mode !== 'local-demo') return;
  const container = document.querySelector<HTMLElement>('#race-overlay .overlay-summary');
  if (!container) return;
  mountWave3DemoResults({ container, settlement: receipt, locale, raceMode: race.mode,
    artworkUrl: wave3DemoArtUrl('demo-points'),
    artworkFallbackUrl: wave3DemoArtUrl('demo-points', 'png') });
}
