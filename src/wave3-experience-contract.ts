/** Disposable local demo, not a server-backed wallet or proof of ownership. */
export const WAVE3_EXPERIENCE_VERSION = 1 as const;
export const WAVE3_CATALOG_VERSION = 1 as const;

export type Wave3EventKind = 'finish' | 'drift' | 'combo';
export type DemoCurrency = 'points' | 'coins' | 'diamonds';
export type DemoInsufficient = `insufficient-demo-${DemoCurrency}`;
export type Wave3Status = 'completed' | 'duplicate' | 'ineligible' | DemoInsufficient | 'unavailable' | 'expired' | 'invalid';
export type DemoEconomy = Readonly<{ coins: number; diamonds: number; firstFinishes: readonly string[] }>;
export const DEMO_BALANCE_LIMIT = 1_000_000_000;

export function validDemoEconomy(value: unknown): value is DemoEconomy {
  if (!value || typeof value !== 'object') return false;
  const { coins, diamonds, firstFinishes } = value as DemoEconomy;
  return Object.keys(value).length === 3 && ['coins', 'diamonds', 'firstFinishes'].every(key => Object.hasOwn(value, key)) &&
    [coins, diamonds].every(amount => Number.isSafeInteger(amount) && amount >= 0 && amount <= DEMO_BALANCE_LIMIT) &&
    Array.isArray(firstFinishes) && firstFinishes.length <= 128 &&
    firstFinishes.every(id => typeof id === 'string' && /^[a-z0-9-]{4,64}$/.test(id)) &&
    new Set(firstFinishes).size === firstFinishes.length;
}
export type MissionProgress = Readonly<{ progress: number; goal: number; claimed: boolean; rewardDemoPoints: number }>;
export type ExperienceSnapshot = Readonly<{
  version: typeof WAVE3_EXPERIENCE_VERSION;
  catalogVersion: typeof WAVE3_CATALOG_VERSION;
  mode: 'local-demo' | 'server';
  authority: 'local' | 'verified';
  syncState: 'local-only' | 'synced' | 'unavailable';
  accountId: string;
  missions: Readonly<Record<string, MissionProgress>>;
  demoPoints: number;
  demoEconomy?: DemoEconomy;
  demoInventory: readonly string[];
  equippedPreview: string | null;
  updatedAt: number;
}>;
export type GameEvent = Readonly<{
  schemaVersion: typeof WAVE3_EXPERIENCE_VERSION;
  eventId: string;
  completionId: string;
  trackId: string;
  mode: string;
  kind: Wave3EventKind;
  occurredAt: number;
  eligible: boolean;
  accountId?: string;
}>;
export type DemoRaceMetrics = Readonly<{
  legs: readonly Readonly<{ trackId: string; distance: number }>[];
  difficulty?: string;
  position?: number;
  rivalCount: number;
}>;
export type RaceCompletion = Readonly<{
  schemaVersion: typeof WAVE3_EXPERIENCE_VERSION;
  completionId: string;
  trackId: string;
  mode: string;
  occurredAt: number;
  eligible: boolean;
  accountId?: string;
  demoRace?: DemoRaceMetrics;
}>;
export type ExperienceResult = Readonly<{
  status: Wave3Status;
  snapshot: ExperienceSnapshot;
  deltaDemoPoints: number;
  deltaDemoCoins?: number;
  deltaDemoDiamonds?: number;
}>;

/** UI seam; a future server implementation must never trust local-demo receipts. */
export type Wave3ExperiencePort = Readonly<{
  getSnapshot(): ExperienceSnapshot;
  subscribe(listener: (snapshot: ExperienceSnapshot) => void): () => void;
  recordGameEvent(event: GameEvent): ExperienceResult;
  settleCompletion(completion: RaceCompletion): ExperienceResult;
  claimMission(missionId: string): ExperienceResult;
  redeemPreview(itemId: string): ExperienceResult;
  equipPreview(itemId: string): ExperienceResult;
  resetDemo(): ExperienceSnapshot;
  setAccount(accountId: string | null): ExperienceSnapshot;
}>;
