import { reactive } from 'vue';
import { createCup, type CupState } from './championship-cup.ts';
import { loadCupProgress, saveCupProgress, retryCupHeat } from './cup-progress.ts';
import { onLocaleChange, getLocale, trackName, t } from './i18n.ts';

export const cupRecoveryView = reactive({ available: false, summary: '' });
export const cupRecoveryActions = { resume: () => {}, discard: () => {} };

export function setupCupRecovery(deps: {
  unlocked: () => string[];
  canResume: () => boolean;
  resume: (cup: CupState) => void;
  cue: () => void;
}) {
  function refresh() {
    const saved = loadCupProgress(deps.unlocked());
    cupRecoveryView.available = saved !== null;
    cupRecoveryView.summary = saved ? t('mode.cupRecovery', {
      n: saved.results.length + 1, total: saved.tracks.length,
      track: trackName(saved.tracks[saved.results.length], getLocale()),
    }) : '';
  }
  function remember(cup: CupState | null) { saveCupProgress(cup); refresh(); }
  cupRecoveryActions.resume = () => {
    const saved = loadCupProgress(deps.unlocked());
    if (!saved || !deps.canResume()) { refresh(); return; }
    deps.resume(saved);
  };
  cupRecoveryActions.discard = () => { remember(null); deps.cue(); };
  onLocaleChange(refresh);
  refresh();
  return { remember, refresh, retry: (cup: CupState, track: string) => {
    const next = retryCupHeat(cup, track);
    remember(next);
    return next;
  }, start: (track: string, count: number) => {
    const cup = createCup(deps.unlocked(), track, count);
    remember(cup);
    return cup;
  } };
}
