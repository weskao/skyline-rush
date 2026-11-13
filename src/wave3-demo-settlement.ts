import { COURSE_RUNTIMES } from './course-runtimes.ts';
import { raceTrack } from './race-tracks.ts';
import type { DemoCurrency, DemoRaceMetrics, ExperienceSnapshot } from './wave3-experience-contract.ts';

type DemoOffer = Readonly<{ currency: DemoCurrency; cost: number }>;
const DEMO_OFFERS: Readonly<Record<string, DemoOffer>> = {
  'thruster-ion': { currency: 'points', cost: 25 },
  'thruster-plasma': { currency: 'points', cost: 100 },
  'nitro-trail-cyan': { currency: 'coins', cost: 150 },
  'airflow-slipstream': { currency: 'coins', cost: 500 },
  'nitro-trail-gold': { currency: 'coins', cost: 1200 },
  'thruster-void': { currency: 'diamonds', cost: 15 },
  'airflow-prism': { currency: 'diamonds', cost: 25 },
};

export const demoOffer = (itemId: string): DemoOffer | undefined =>
  Object.hasOwn(DEMO_OFFERS, itemId) ? DEMO_OFFERS[itemId] : undefined;
export const demoBalance = (snapshot: ExperienceSnapshot, currency: DemoCurrency): number =>
  currency === 'points' ? snapshot.demoPoints : snapshot.demoEconomy?.[currency] ?? 0;
export const insufficientDemo = (currency: DemoCurrency): `insufficient-demo-${DemoCurrency}` =>
  `insufficient-demo-${currency}`;
export const canAwardFirstFinish = (trackId: string): boolean =>
  /^[a-z0-9-]{4,64}$/.test(trackId) && Number.isFinite(raceTrack(trackId)?.length);
export const demoMissionBonus = (missionId: string) => ({
  coins: missionId === 'mission-race:daily' ? 40 : 0,
  diamonds: missionId === 'mission-race:weekly' ? 5 : 0,
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

export function demoRaceReward(metrics?: DemoRaceMetrics): number {
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
