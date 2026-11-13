import type { ExperienceResult, MissionProgress } from './wave3-experience-contract.ts';
import { formatDemoReward } from './wave3-currency-view.ts';

type Locale = 'en' | 'zh-TW';
type State = 'earned' | 'duplicate' | 'ineligible' | 'unavailable';
export type DemoMissionView = Readonly<{ id: string; label: string; progress: number; goal: number; description: string }>;
type DemoBalanceView = Readonly<{ label: string; from: number; total: number }>;
export type DemoResultView = Readonly<{
  state: State; heading: string; status: string; points: string | null;
  balance: DemoBalanceView | null;
  coins: string | null; coinBalance: DemoBalanceView | null;
  progressHeading: string; missions: readonly DemoMissionView[];
  distinction: string; disclaimer: string; details: string;
}>;

const COPY = {
  en: {
    heading: 'Demo reward', earned: 'Local demo race reward recorded.', duplicate: 'Already recorded — no additional Demo rewards.',
    ineligible: 'This result is not eligible for a Demo reward.', unavailable: 'Demo rewards are unavailable for this result.',
    points: 'Demo points', balance: 'Demo points balance', coinBalance: 'Demo coins balance', progress: 'Current demo mission progress',
    distinction: 'Separate from race stars, placement badges and medals.',
    disclaimer: 'Local demo only · This device only · Not verified or permanent.',
    missions: { 'mission-race': 'Race finish', 'mission-time': 'Time trial', 'mission-drift': 'Drift', 'mission-combo': 'Combo' },
    claimed: 'Demo claimed', details: 'Details',
  },
  'zh-TW': {
    heading: '試玩獎勵', earned: '已記錄本機試玩賽事獎勵。', duplicate: '此結果已記錄，不會再次發放試玩獎勵。',
    ineligible: '此賽事結果不符合試玩獎勵資格。', unavailable: '目前無法顯示此結果的試玩獎勵。',
    points: '試玩點數', balance: '試玩點數總額', coinBalance: '試玩金幣總額', progress: '目前試玩任務進度',
    distinction: '與正式比賽星星、名次徽章及獎牌分開計算。',
    disclaimer: '僅限本機試玩 · 僅此裝置 · 未經伺服器驗證，也非永久獎勵。',
    missions: { 'mission-race': '完成比賽', 'mission-time': '計時賽', 'mission-drift': '甩尾', 'mission-combo': '連擊' },
    claimed: '已領取試玩獎勵', details: '詳情',
  },
} as const;

const bounded = (value: number, maximum: number): number => Number.isFinite(value) ? Math.min(maximum, Math.max(0, Math.floor(value))) : 0;

/** Read-only projection of the F01 adapter's already-settled receipt; never grants anything. */
export function projectWave3DemoResults(
  settlement: ExperienceResult | null | undefined,
  { locale = 'en', raceMode = 'classic' }: { locale?: string; raceMode?: string } = {},
): DemoResultView {
  const copy = COPY[locale === 'zh-TW' ? 'zh-TW' : 'en'];
  const snapshot = settlement?.snapshot;
  const local = snapshot?.mode === 'local-demo' && snapshot.authority === 'local' && snapshot.syncState === 'local-only';
  const status = settlement?.status;
  const state: State = !local ? 'unavailable' : status === 'completed' ? 'earned'
    : status === 'duplicate' ? 'duplicate' : status === 'ineligible' ? 'ineligible' : 'unavailable';
  const amount = state === 'earned' && Number.isFinite(settlement?.deltaDemoPoints)
    ? Math.max(0, Math.floor(settlement!.deltaDemoPoints)) : 0;
  const total = snapshot?.demoPoints ?? 0;
  const balance = amount > 0 && Number.isSafeInteger(total) && total >= amount
    ? { label: copy.balance, from: total - amount, total } : null;
  const coinDelta = settlement?.deltaDemoCoins ?? 0;
  const coinTotal = snapshot?.demoEconomy?.coins ?? 0;
  const coinBalance = state === 'earned' && Number.isSafeInteger(coinDelta) && coinDelta > 0 &&
    Number.isSafeInteger(coinTotal) && coinTotal >= coinDelta
    ? { label: copy.coinBalance, from: coinTotal - coinDelta, total: coinTotal } : null;
  const ids = [raceMode === 'time' ? 'mission-time' : 'mission-race', 'mission-drift', 'mission-combo'] as const;
  const missions: DemoMissionView[] = [];
  if (state === 'earned' || state === 'duplicate') {
    for (const id of ids) {
      const mission: MissionProgress | undefined = snapshot?.missions?.[id];
      if (!mission || !Number.isFinite(mission.goal) || mission.goal <= 0 || !Number.isFinite(mission.progress)) continue;
      const goal = Math.max(1, Math.floor(mission.goal)), progress = bounded(mission.progress, goal);
      if (!progress && id !== ids[0]) continue;
      missions.push({ id, label: copy.missions[id], goal, progress,
        description: `${copy.missions[id]} ${progress}/${goal}${mission.claimed ? ` · ${copy.claimed}` : ''}` });
    }
  }
  return {
    state, heading: copy.heading,
    status: copy[state], points: amount > 0 ? `+${amount} ${copy.points}` : null, balance,
    coins: coinBalance ? formatDemoReward({ coins: coinDelta }, locale ?? 'en') : null, coinBalance,
    progressHeading: copy.progress, missions, distinction: copy.distinction, disclaimer: copy.disclaimer, details: copy.details,
  };
}
