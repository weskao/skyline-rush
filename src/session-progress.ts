import { loadBests, loadHistory, loadModeHistory, loadMedals, loadStars, loadDaily, validDaily } from './history.ts';
import { readLocalProgress } from './cloud-progress.ts';
import type { MergedProgress } from './cloud-progress-merge.ts';
import type { DailyRun } from './history-daily.ts';

type Stored<T> = T | MergedProgress['history'][number];
/**
 * The session's copies of saved progress. They keep results honest when storage is blocked,
 * and cloud sync or a backup import merges into them.
 */
export interface SessionProgress {
  unlocked: Set<string>;
  bests: Record<string, number>;
  stars: Record<string, number>;
  medals: Record<string, string>;
  history: Stored<ReturnType<typeof loadHistory>[number]>[];
  modeHistory: Stored<ReturnType<typeof loadModeHistory>[number]>[];
  daily: DailyRun[];
}

export function loadSessionProgress(unlocked: Iterable<string>): SessionProgress {
  return { unlocked: new Set(unlocked), bests: loadBests(), stars: loadStars(), medals: loadMedals(),
    history: loadHistory(), modeHistory: loadModeHistory(), daily: loadDaily() };
}

/** bests and stars keep their identity because other screens hold them. */
export function adoptProgress(progress: SessionProgress, merged: MergedProgress): void {
  for (const id of merged.unlocked) progress.unlocked.add(id);
  Object.assign(progress.stars, merged.stars);
  Object.assign(progress.bests, merged.bests);
  progress.history = merged.history;
  progress.modeHistory = merged.modeHistory;
  progress.medals = merged.medals;
  // Already validated by the merge; the guard narrows the type.
  progress.daily = merged.daily.filter((run): run is typeof run & DailyRun => validDaily(run));
}

/** What a cloud save or backup export writes: stored progress overlaid with this session's copies. */
export const progressSnapshot = (progress: SessionProgress) => ({
  ...readLocalProgress(), unlocked: [...progress.unlocked], stars: progress.stars,
  bests: { ...loadBests(), ...progress.bests }, medals: progress.medals, history: progress.history,
  modeHistory: progress.modeHistory, daily: progress.daily,
});
