/** Test-only demo fixtures. Never infer a paid price or real entitlement from these. */
export const DEMO_REDEMPTION_COSTS: Readonly<Record<string, number>> = Object.freeze({
  'thruster-ion': 25,
  'thruster-plasma': 100,
});
export const DEMO_START_POINTS = 20;
export const DEMO_RACE_REWARD = 20;
export const DEMO_MISSION_CLAIM_REWARD = 10;
export const DEMO_ELIGIBLE_MODES = new Set(['classic', 'time', 'checkpoint', 'gauntlet', 'stunt', 'cup', 'custom', 'circuit', 'elimination']);

/** Local-only, atomically applied to the in-memory state (not a server transaction). */
export function demoSettlement(credits: number, completionId: string, completedIds: Set<string>) {
  if (completedIds.has(completionId)) return { status: 'duplicate' as const, credits, delta: 0 };
  completedIds.add(completionId);
  return { status: 'completed' as const, credits: credits + DEMO_RACE_REWARD, delta: DEMO_RACE_REWARD };
}

export function demoRedemption(credits: number, itemId: string, redeemed: Set<string>) {
  if (!Object.hasOwn(DEMO_REDEMPTION_COSTS, itemId)) return { status: 'invalid' as const, credits, delta: 0 };
  if (redeemed.has(itemId)) return { status: 'duplicate' as const, credits, delta: 0 };
  const price = DEMO_REDEMPTION_COSTS[itemId]!;
  if (credits < price) return { status: 'insufficient-demo-points' as const, credits, delta: 0 };
  redeemed.add(itemId);
  return { status: 'completed' as const, credits: credits - price, delta: -price };
}
