// Preview-only UI metadata. No source of truth for progress, ownership, payouts or prices.
export type Wave3PreviewCategory = 'garage-rewards-and-missions' | 'garage-store-readiness';
export type Wave3PreviewGroup = 'all' | 'mission' | 'trophy' | 'store' | 'collection';
export type Wave3Text = { readonly en: string; readonly 'zh-TW': string };
type Tone = 'azure' | 'magenta' | 'gold' | 'slate' | 'cyan' | 'amber' | 'red';
export type Wave3PreviewItem = {
  readonly id: string;
  readonly group: Exclude<Wave3PreviewGroup, 'all'>;
  readonly tone: Tone;
  readonly name: Wave3Text;
  readonly description: Wave3Text;
};
type Wave3PreviewCatalog = {
  readonly cssSize: number;
  readonly sourcePx: number;
  readonly heading: Wave3Text;
  readonly notice: Wave3Text;
  readonly filters: readonly { readonly id: Wave3PreviewGroup; readonly name: Wave3Text }[];
  readonly items: readonly Wave3PreviewItem[];
};
const text = (en: string, zh: string): Wave3Text => ({ en, 'zh-TW': zh });
export const WAVE3_PREVIEW_CATALOG: Readonly<Record<Wave3PreviewCategory, Wave3PreviewCatalog>> = {
  'garage-rewards-and-missions': {
    cssSize: 96, sourcePx: 288,
    heading: text('Mission & trophy concepts', '任務與獎盃概念'),
    notice: text('Art preview only. Challenges, progress and rewards are not yet available.',
      '僅供外觀預覽；任務、進度與獎勵功能尚未開放。'),
    filters: [
      { id: 'all', name: text('All', '全部') },
      { id: 'mission', name: text('Missions', '任務') },
      { id: 'trophy', name: text('Trophies', '獎盃') },
    ],
    items: [
      { id:'mission-race', group:'mission', tone:'azure', name:text('Race challenge', '競速挑戰'), description:text('Race-themed mission artwork; no active objective yet.', '競速主題的任務圖示，尚未啟用挑戰目標。') },
      { id:'mission-time', group:'mission', tone:'cyan', name:text('Time challenge', '計時挑戰'), description:text('Time-themed mission artwork; no timer or payout is active.', '計時主題的任務圖示，尚未啟用計時獎勵。') },
      { id:'mission-drift', group:'mission', tone:'magenta', name:text('Drift challenge', '甩尾挑戰'), description:text('Drift-themed mission artwork; no progress is tracked here.', '甩尾主題的任務圖示，此處不會記錄任務進度。') },
      { id:'mission-combo', group:'mission', tone:'gold', name:text('Combo challenge', '連擊挑戰'), description:text('Combo-themed mission artwork; no mission completion is granted.', '連擊主題的任務圖示，不會因此授予任務完成狀態。') },
      { id:'trophy-bronze', group:'trophy', tone:'amber', name:text('Bronze trophy', '銅級獎盃'), description:text('Bronze trophy concept; not an earned achievement.', '銅級獎盃的概念外觀，不代表已獲得成就。') },
      { id:'trophy-silver', group:'trophy', tone:'slate', name:text('Silver trophy', '銀級獎盃'), description:text('Silver trophy concept; not an earned achievement.', '銀級獎盃的概念外觀，不代表已獲得成就。') },
      { id:'trophy-gold', group:'trophy', tone:'gold', name:text('Gold trophy', '金級獎盃'), description:text('Gold trophy concept; not an earned achievement.', '金級獎盃的概念外觀，不代表已獲得成就。') },
      { id:'trophy-platinum', group:'trophy', tone:'cyan', name:text('Platinum trophy', '白金獎盃'), description:text('Platinum trophy concept; not an earned achievement.', '白金獎盃的概念外觀，不代表已獲得成就。') },
    ],
  },
  'garage-store-readiness': {
    cssSize: 72, sourcePx: 216,
    heading: text('Store concept gallery', '商店概念展示'),
    notice: text('Coming soon. No items can be bought, priced or granted here.',
      '即將推出。這裡沒有可購買、定價或領取的商品。'),
    filters: [
      { id:'all', name:text('All', '全部') },
      { id:'store', name:text('Store UI', '商店介面') },
      { id:'collection', name:text('Collection', '收藏展示') },
    ],
    items: [
      { id:'store-cart', group:'store', tone:'azure', name:text('Shop icon', '商店圖示'), description:text('Visual concept for the future shop navigation; checkout is unavailable.', '未來商店導覽的視覺概念，尚無結帳功能。') },
      { id:'store-box', group:'store', tone:'amber', name:text('Mystery box icon', '禮盒圖示'), description:text('Display-only package icon; no randomized items or rewards are offered.', '純展示的禮盒圖示，目前沒有抽取物品或發放獎勵。') },
      { id:'store-bundle', group:'store', tone:'gold', name:text('Bundle icon', '組合圖示'), description:text('Concept for a future group of cosmetics; no pack is sold.', '未來外觀組合的概念，目前沒有出售組合商品。') },
      { id:'store-tag', group:'store', tone:'magenta', name:text('Label icon', '標籤圖示'), description:text('Decorative catalog label; no discount or price is active.', '裝飾用的收藏標籤，沒有折扣或定價。') },
      { id:'store-star', group:'collection', tone:'gold', name:text('Featured icon', '精選圖示'), description:text('Featured-collection artwork; no ownership or recommendation is implied.', '精選收藏外觀，不代表擁有權或正式推薦。') },
      { id:'store-collection', group:'collection', tone:'cyan', name:text('Collection icon', '收藏圖示'), description:text('Collection navigation concept; your real inventory is unchanged.', '收藏導覽概念，不會更改真實物品清單。') },
    ],
  },
};
export function filterWave3PreviewItems(category: Wave3PreviewCategory, group: Wave3PreviewGroup): readonly Wave3PreviewItem[] {
  const items = WAVE3_PREVIEW_CATALOG[category].items;
  return group === 'all' ? items : items.filter(item => item.group === group);
}
