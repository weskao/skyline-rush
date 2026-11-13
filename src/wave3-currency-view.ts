import type { DemoCurrency, ExperienceSnapshot } from './wave3-experience-contract.ts';

export type Wave3CurrencyRow = Readonly<{
  id: 'demo-points' | 'coins' | 'diamonds';
  label: string;
  display: string;
  amount: number | null;
  state: 'local-demo' | 'unavailable';
  note: string;
  detail: string;
}>;

const DEMO_LABELS = {
  points: { en: 'Demo points', 'zh-TW': '試玩點數' },
  coins: { en: 'Demo coins', 'zh-TW': '試玩金幣' },
  diamonds: { en: 'Demo diamonds', 'zh-TW': '試玩鑽石' },
} as const;

export const demoCurrencyLabel = (currency: DemoCurrency, locale: string) =>
  DEMO_LABELS[currency][locale === 'zh-TW' ? 'zh-TW' : 'en'];

export function formatDemoReward(delta: Partial<Record<DemoCurrency, number>>, locale: string): string {
  return (['points', 'coins', 'diamonds'] as const)
    .filter(currency => (delta[currency] ?? 0) > 0)
    .map(currency => `+${delta[currency]} ${demoCurrencyLabel(currency, locale)}`)
    .join(' · ');
}

/** Projection of the disposable trial wallet. Verified balances use a separate adapter. */
export function projectWave3Currency(
  snapshot: ExperienceSnapshot | null | undefined,
  locale = 'en',
): readonly Wave3CurrencyRow[] {
  const zh = locale === 'zh-TW';
  const local = snapshot?.mode === 'local-demo' && snapshot.authority === 'local' && snapshot.syncState === 'local-only';
  const points = snapshot?.demoPoints;
  const amount = local && typeof points === 'number' && Number.isSafeInteger(points) && points >= 0 ? points : null;
  const empty = snapshot == null || (local && points == null);
  const invalid = amount === null && !empty;
  const note = zh ? '本機試玩 · 可重設' : 'Local demo · Resettable';
  const resource = (id: 'coins' | 'diamonds', en: string, tw: string): Wave3CurrencyRow => {
    const total = local ? snapshot.demoEconomy?.[id] : undefined;
    if (typeof total === 'number' && Number.isSafeInteger(total) && total >= 0) {
      return { id, label: demoCurrencyLabel(id, locale), display: total.toLocaleString(zh ? 'zh-TW' : 'en-US'),
        amount: total, state: 'local-demo', note, detail: zh ? tw : en };
    }
    return { id, label: id === 'coins' ? (zh ? '金幣' : 'Coins') : (zh ? '鑽石' : 'Diamonds'),
      display: '0', amount: null, state: 'unavailable', note: zh ? '尚未開放' : 'Coming soon',
      detail: zh ? '功能開放後，這裡會顯示餘額。' : 'Your balance will appear here when available.' };
  };
  return [
    { id: 'demo-points', label: demoCurrencyLabel('points', locale),
      display: invalid ? '—' : (amount ?? 0).toLocaleString(zh ? 'zh-TW' : 'en-US'), amount,
      state: amount === null ? 'unavailable' : 'local-demo',
      note: invalid ? (zh ? '暫時無法讀取餘額' : 'Balance unavailable')
        : note,
      detail: zh ? '完成比賽或領取任務獎勵可獲得試玩點數，用來兌換車庫的試玩外觀。'
        : 'Earn demo points by racing or claiming missions. Use them to redeem preview cosmetics in the Garage.' },
    resource('coins', 'Earn demo coins from eligible races, first finishes and the daily race mission.',
      '完成符合資格的比賽、首次完賽與每日競速任務，即可獲得試玩金幣。'),
    resource('diamonds', 'Claim the weekly race mission after five eligible race finishes.',
      '完成五場符合資格的競速後，領取每週競速任務的試玩鑽石。'),
  ];
}
