import type { ExperienceSnapshot } from './wave3-experience-contract.ts';

export type Wave3CurrencyRow = Readonly<{
  id: 'demo-points' | 'coins' | 'diamonds';
  label: string;
  display: string;
  amount: number | null;
  state: 'local-demo' | 'unavailable';
  note: string;
}>;

/** Presentation only; never synthesize coins, diamonds or verified credits from local demo data. */
export function projectWave3Currency(
  snapshot: ExperienceSnapshot | null | undefined,
  locale = 'en',
): readonly Wave3CurrencyRow[] {
  const zh = locale === 'zh-TW';
  const eligible = snapshot?.mode === 'local-demo' && snapshot.authority === 'local' &&
    snapshot.syncState === 'local-only' && Number.isSafeInteger(snapshot.demoPoints) && snapshot.demoPoints >= 0;
  const amount = eligible ? snapshot.demoPoints : null;
  return [
    { id: 'demo-points', label: zh ? '試玩點數' : 'Demo points',
      display: amount === null ? '—' : amount.toLocaleString(zh ? 'zh-TW' : 'en-US'), amount,
      state: eligible ? 'local-demo' : 'unavailable',
      note: eligible ? (zh ? '本機試玩 · 可重設' : 'Local demo · Resettable')
        : (zh ? '目前無可用數據' : 'Balance unavailable') },
    { id: 'coins', label: zh ? '金幣' : 'Coins', display: '—', amount: null,
      state: 'unavailable', note: zh ? '尚未開放' : 'Coming soon' },
    { id: 'diamonds', label: zh ? '鑽石' : 'Diamonds', display: '—', amount: null,
      state: 'unavailable', note: zh ? '尚未開放' : 'Coming soon' },
  ];
}
