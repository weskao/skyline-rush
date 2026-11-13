import { COURSE_RUNTIMES } from './course-runtimes.ts';
import { raceTrack } from './race-tracks.ts';
import type { DemoRaceMetrics } from './wave3-experience-contract.ts';

/** Test-only demo fixtures. Never infer a paid price or real entitlement from these. */
export const DEMO_REDEMPTION_COSTS: Readonly<Record<string, number>> = Object.freeze({
  'thruster-ion': 25,
  'thruster-plasma': 100,
});
export const DEMO_START_POINTS = 20;
export const DEMO_RACE_REWARD = 20;
export const DEMO_MISSION_CLAIM_REWARD = 10;
export const DEMO_ELIGIBLE_MODES = new Set(['classic', 'time', 'checkpoint', 'gauntlet', 'stunt', 'cup', 'custom', 'circuit', 'elimination']);

const TRACK_HAZARDS = new Set(['crosswind', 'ice', 'uphill']);
const TECHNICAL_SECTIONS = new Set(['gap', 'spiral']);
const PLACEMENT_FACTORS = [1.4, 1.25, 1.15, 1.05, 1, .97, .93, .9] as const;

function routeFactor(trackId: string): number {
  const track = raceTrack(trackId);
  if (track?.sections.some(section => TECHNICAL_SECTIONS.has(section.type)) ||
    (Object.hasOwn(COURSE_RUNTIMES, trackId) && COURSE_RUNTIMES[trackId]!.spec.hazards.length)) return 1.15;
  return track?.sections.some(section => TRACK_HAZARDS.has(section.type)) ? 1.1 : 1;
}

function demoRaceReward(metrics?: DemoRaceMetrics): number {
  if (!metrics?.legs.length) return DEMO_RACE_REWARD;
  let distance = 0;
  let weightedChallenge = 0;
  for (const leg of metrics.legs) {
    if (!Number.isFinite(leg.distance) || leg.distance < 0) return DEMO_RACE_REWARD;
    distance += leg.distance;
    weightedChallenge += leg.distance * routeFactor(leg.trackId);
  }
  const distanceKm = Math.min(12, Math.max(1, distance / 1000));
  const trackFactor = distance > 0 ? weightedChallenge / distance : routeFactor(metrics.legs[0]!.trackId);
  const competitive = metrics.rivalCount > 0;
  const aiFactor = competitive ? (metrics.difficulty === 'easy' ? .85 : metrics.difficulty === 'hard' ? 1.22 : 1) : 1;
  const position = metrics.position ?? 0;
  const rankFactor = competitive && position <= metrics.rivalCount + 1 ? PLACEMENT_FACTORS[position - 1] ?? 1 : 1;
  return Math.round((10 + 2 * distanceKm) * trackFactor * aiFactor * rankFactor);
}

/** Local-only, atomically applied to the in-memory state (not a server transaction). */
export function demoSettlement(credits: number, completionId: string, completedIds: Set<string>, metrics?: DemoRaceMetrics) {
  if (completedIds.has(completionId)) return { status: 'duplicate' as const, credits, delta: 0 };
  completedIds.add(completionId);
  const delta = demoRaceReward(metrics);
  return { status: 'completed' as const, credits: credits + delta, delta };
}

export function demoRedemption(credits: number, itemId: string, redeemed: Set<string>) {
  if (!Object.hasOwn(DEMO_REDEMPTION_COSTS, itemId)) return { status: 'invalid' as const, credits, delta: 0 };
  if (redeemed.has(itemId)) return { status: 'duplicate' as const, credits, delta: 0 };
  const price = DEMO_REDEMPTION_COSTS[itemId]!;
  if (credits < price) return { status: 'insufficient-demo-points' as const, credits, delta: 0 };
  redeemed.add(itemId);
  return { status: 'completed' as const, credits: credits - price, delta: -price };
}
