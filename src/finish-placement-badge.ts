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
