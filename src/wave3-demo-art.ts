import type { DemoCurrency } from './wave3-experience-contract.ts';

/** Approved local-demo artwork only. Never a paid currency or permanent entitlement. */
export type Wave3DemoArtId = 'demo-points' | 'demo-claim' | 'demo-collection-empty' | 'demo-results-banner'
  | 'wallet-coin' | 'wallet-diamond';
export function wave3DemoArtUrl(id: Wave3DemoArtId): string {
  return `${import.meta.env.BASE_URL}feature-assets/wave3-demo/raster/${id}@3x.webp`;
}

const CURRENCY_ART = { points: 'demo-points', coins: 'wallet-coin', diamonds: 'wallet-diamond' } as const;

export const wave3CurrencyArtUrl = (currency: DemoCurrency): string => wave3DemoArtUrl(CURRENCY_ART[currency]);
