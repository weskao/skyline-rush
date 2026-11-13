/** Disposable local demo, not a server-backed wallet or proof of ownership. */
export const WAVE3_EXPERIENCE_VERSION = 1 as const;
export const WAVE3_CATALOG_VERSION = 1 as const;

export type Wave3EventKind = 'finish' | 'drift' | 'combo';
export type Wave3Status = 'completed' | 'duplicate' | 'ineligible' | 'insufficient-demo-points' | 'unavailable' | 'expired' | 'invalid';
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
export type ExperienceResult = Readonly<{ status: Wave3Status; snapshot: ExperienceSnapshot; deltaDemoPoints: number }>;

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
