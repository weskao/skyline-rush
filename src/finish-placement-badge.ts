/** Display-only finish placement decoration. Never an earned ownership/settlement record. */
export type PlacementTier = 'gold' | 'silver' | 'bronze';
export type PlacementBadge = Readonly<{ tier: PlacementTier; name: string; displayOnly: true }>;
const TIERS: readonly PlacementTier[] = ['gold', 'silver', 'bronze'];
const LABELS: Record<PlacementTier, Readonly<{ en: string; 'zh-TW': string }>> = {
  gold: { en: 'Gold', 'zh-TW': '金牌' },
  silver: { en: 'Silver', 'zh-TW': '銀牌' },
  bronze: { en: 'Bronze', 'zh-TW': '銅牌' },
};
export function presentationPlacementBadge(position: number, players: number, locale: 'en' | 'zh-TW'): PlacementBadge | null {
  if (!Number.isInteger(players) || players < 2 || !Number.isInteger(position) || position < 1 || position > players || position > 3)
    return null;
  const tier = TIERS[position - 1];
  return { tier, name: LABELS[tier][locale === 'zh-TW' ? locale : 'en'], displayOnly: true };
}

/** 288px source shown at 96 CSS pixels (native 3x). This is decoration, not an award. */
export function placementBadgeArtwork(tier: PlacementTier, baseUrl: string): Readonly<{ src: string; cssSize: 96; sourcePixels: 288 }> {
  const base = /^\/(?!\/)(?:[A-Za-z0-9_-]+\/)*$/.test(baseUrl) ? baseUrl : '/';
  return { src: `${base}feature-assets/garage-rewards-and-missions/raster/trophy-${tier}@3x.webp`,
    cssSize: 96, sourcePixels: 288 };
}
