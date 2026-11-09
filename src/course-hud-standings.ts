import type { CourseStanding } from './course-ai-standings.ts';

interface Racer { name: string; distance: number }

/** Legacy race order is odometer-based; graph racing uses authoritative checkpoint-aware places. */
export function orderRaceLeaderboard<T extends Racer>(racers: readonly T[], standings?: readonly CourseStanding[]): T[] {
  if (!standings) return [...racers].sort((a, b) => b.distance - a.distance);
  const place = new Map(standings.map(s => [s.id, s.place]));
  return [...racers].sort((a, b) => (place.get(a.name) ?? Infinity) - (place.get(b.name) ?? Infinity));
}

/** Use physical distance-to-go for graph courses instead of comparing incompatible branch odometers. */
export function graphRivalGap(standings: readonly CourseStanding[], rivalId: string): number | null {
  const player = standings.find(s => s.id === 'YOU');
  const rival = standings.find(s => s.id === rivalId);
  if (!player || !rival || !Number.isFinite(player.remainingMetres) || !Number.isFinite(rival.remainingMetres)) return null;
  return player.remainingMetres - rival.remainingMetres;
}
