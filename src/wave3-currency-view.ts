import type { ExperienceSnapshot } from './wave3-experience-contract.ts';

export type Wave3CurrencyRow = Readonly<{
  id: 'demo-points' | 'coins' | 'diamonds';
  label: string;
  display: string;
  amount: number | null;
  state: 'local-demo' | 'unavailable';
  note: string;
  detail: string;
}>;

/** Presentation only; never synthesize coins, diamonds or verified credits from local demo data. */
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
  return [
    { id: 'demo-points', label: zh ? '試玩點數' : 'Demo points',
      display: invalid ? '—' : (amount ?? 0).toLocaleString(zh ? 'zh-TW' : 'en-US'), amount,
      state: amount === null ? 'unavailable' : 'local-demo',
      note: invalid ? (zh ? '暫時無法讀取餘額' : 'Balance unavailable')
        : (zh ? '本機試玩 · 可重設' : 'Local demo · Resettable'),
      detail: zh ? '完成比賽或領取任務獎勵可獲得試玩點數，用來兌換車庫的試玩外觀。'
        : 'Earn demo points by racing or claiming missions. Use them to redeem preview cosmetics in the Garage.' },
    { id: 'coins', label: zh ? '金幣' : 'Coins', display: '0', amount: null,
      state: 'unavailable', note: zh ? '尚未開放' : 'Coming soon',
      detail: zh ? '金幣功能開放後，這裡會顯示你的金幣餘額。'
        : 'Your coin balance will appear here when coins become available.' },
    { id: 'diamonds', label: zh ? '鑽石' : 'Diamonds', display: '0', amount: null,
      state: 'unavailable', note: zh ? '尚未開放' : 'Coming soon',
      detail: zh ? '鑽石功能開放後，這裡會顯示你的鑽石餘額。'
        : 'Your diamond balance will appear here when diamonds become available.' },
  ];
}
