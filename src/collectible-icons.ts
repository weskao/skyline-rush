import type { SkinCategory } from './garage-skin-catalog.ts';
import type { AcquisitionItem } from './acquisition-reveal.ts';
import { wave3CurrencyArtUrl } from './wave3-demo-art.ts';
import type { DemoCurrency } from './wave3-experience-contract.ts';

export const collectibleIconUrl = (name: string): string =>
  name === 'diamond'
    ? wave3CurrencyArtUrl('diamonds')
    : `${import.meta.env.BASE_URL}feature-assets/collectible-ui/${name}@3x.webp`;

export const skinCategoryIcon: Record<SkinCategory | 'all', string> = {
  all: 'collection', thruster: 'equipment', airflow: 'airflow', 'nitro-trail': 'nitro',
  'launch-flare': 'launch', 'drift-trail': 'drift',
};

export const currencyIcon: Record<DemoCurrency, string> = {
  points: 'price', coins: 'currency', diamonds: 'diamond',
};

export function acquisitionItemIcon(item: AcquisitionItem): string {
  const { id, kind, scope } = item;
  if (kind === 'currency' && scope === 'demo' && Object.hasOwn(currencyIcon, id)) {
    return currencyIcon[id as DemoCurrency];
  }
  return kind;
}
