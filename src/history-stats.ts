// Pure results projections; storage and legacy JSON handling remain in history.js.
export interface CareerRun {
  position?: number;
  distance?: number;
  longestCombo?: number;
  rings?: number;
}

export const validStars = (stars: unknown): stars is 1 | 2 | 3 =>
  typeof stars === 'number' && Number.isInteger(stars) && stars >= 1 && stars <= 3;

export const starTotal = (stars: Record<string, number>): number =>
  Object.values(stars).reduce((sum, value) => sum + value, 0);

export function dailyBoard<T extends { id: string; time: number }>(runs: readonly T[], id: string): T[] {
  return runs.filter(run => run.id === id).sort((a, b) => a.time - b.time);
}

export function careerStats(history: readonly CareerRun[] | null | undefined) {
  const stats = { races: 0, wins: 0, totalDistance: 0, longestCombo: 0, mostRings: 0 };
  for (const run of Array.isArray(history) ? history : []) {
    stats.races++;
    if (run.position === 1) stats.wins++;
    stats.totalDistance += run.distance || 0;
    stats.longestCombo = Math.max(stats.longestCombo, run.longestCombo || 0);
    stats.mostRings = Math.max(stats.mostRings, run.rings || 0);
  }
  return stats;
}
