import { reactive } from 'vue';
import { createCup, cupStandings, cupComplete, cupTotalTime, type CupState } from './championship-cup.ts';
import { loadCupProgress, saveCupProgress } from './cup-progress.ts';
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
  return { remember, refresh, start: (track: string, count: number) => {
    const cup = createCup(deps.unlocked(), track, count);
    remember(cup);
    return cup;
  } };
}

// Existing result overlay remains imperative until its own Vue migration.
export function renderCupResult(cup: CupState, ui: Record<string, HTMLElement>, timeString: (time: number) => string): void {
  const standings = cupStandings(cup);
  const complete = cupComplete(cup);
  const you = standings.find(entry => entry.name === 'YOU')!;
  ui['overlay-title'].textContent = t(complete ? standings[0].name === 'YOU' ? 'mode.cupWon' : 'mode.cupComplete' : 'mode.cupStage', {
    n: cup.results.length, total: cup.tracks.length,
  });
  ui['overlay-copy'].textContent = standings.map(({ name, points }, i) =>
    `${i + 1}. ${name} · ${points} ${t('mode.cupPts')}`).join('  ·  ');
  document.getElementById('next-stage')!.textContent = complete ? '' : t('mode.cupNext', { track: trackName(cup.tracks[cup.results.length], getLocale()) });
  ui['result-stats'].innerHTML = `<div><span>${t('mode.cupPts')}</span><strong>${you.points}</strong></div><div><span>${t('mode.totalTime')}</span><strong>${timeString(cupTotalTime(cup))}</strong></div>`;
}
