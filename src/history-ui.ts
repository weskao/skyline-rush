import { formatDate, t, trackName, getLocale } from './i18n.ts';
import { loadModeBest, loadModeGhost, careerStats, dailyBoard, MEDALS } from './history.js';
import { dailyChallenge } from './game.js';
import { updateHistoryView } from './history-view-state.ts';

interface SavedRace {
  track: string;
  time: number;
  date?: string;
  position?: number;
  score?: number;
  collisions?: number;
  nearMisses?: number;
  rings?: number;
  perfectLines?: number;
  nitroUses?: number;
  distance?: number;
  longestCombo?: number;
}
interface SavedModeRace {
  track: string;
  mode: string;
  rules: string;
  time: number;
  score?: number;
  medal?: string;
  maxCombo?: number;
  airTime?: number;
  date?: string;
}
interface SavedDailyRace {
  id: string;
  track: string;
  modifier: string;
  time: number;
  position: number;
  score: number;
  date: string;
}
interface HistoryData {
  sessionHistory: SavedRace[];
  sessionModeHistory: SavedModeRace[];
  sessionBests: Record<string, number>;
  sessionDaily: SavedDailyRace[];
  sessionMedals: Record<string, string>;
  world: unknown | null | undefined;
}
interface HistoryDependencies {
  getData(): HistoryData;
  timeString(seconds: number): string;
}
type TrendRace = { time: number };


/** Pure chart projection, preserving the original coordinates exactly. */
export function historyTrendPoints(recent: TrendRace[]): Array<[number, number]> {
  if (!recent.length) return [];
  const low = Math.min(...recent.map(run => run.time));
  const high = Math.max(...recent.map(run => run.time));
  return recent.map((run, i) => [recent.length === 1 ? 250 : 10 + i / (recent.length - 1) * 480,
    high === low ? 40 : 70 - (run.time - low) / (high - low) * 60]);
}

// Live selectors are read at render time (cloud sync can replace progress).
export function createHistoryView({ getData, timeString }: HistoryDependencies) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  // Saved dates are untrusted, and Intl throws on an invalid date.
  function shortDate(value?: string): string {
    const date = new Date(value ?? '');
    return Number.isFinite(date.getTime()) ? formatDate(date, { month: 'short', day: 'numeric' }) : t('history.noDate');
  }
  function showHistory() {
    const { sessionHistory, sessionModeHistory, sessionBests, sessionDaily, sessionMedals, world } = getData();
    const trackId = document.querySelector<HTMLSelectElement>('#history-track')!.value;
    const runs = sessionHistory.filter(run => run.track === trackId && Number.isFinite(run.time) && run.time > 0).slice(-50);
    const modeFilter = document.querySelector<HTMLSelectElement>('#mode-history-filter')!.value;
    const modes = sessionModeHistory.filter(run => run.track === trackId)
      .filter(run => modeFilter === 'all' || run.mode === modeFilter).slice(-10).reverse();
    const modeRuns = modes.map(run => {
      let config = null;
      try {
        const candidate = JSON.parse(run.rules);
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate) &&
            candidate.mode === run.mode) config = candidate;
      } catch { /* Opaque legacy rules still display as text. */ }
      const best = config ? loadModeBest(trackId, config) : null;
      const personalBest = best !== null && (run.mode === 'stunt' ? run.score === best : run.time === best);
      const ghost = run.mode === 'time' && !!config && !!loadModeGhost(trackId, config);
      const details = run.mode === 'stunt'
        ? [t('mode.stunt'), t('mode.stuntPoints') + ': ' + Math.round(run.score || 0),
          run.medal ? t('mode.medal.' + run.medal) : '',
          t('mode.comboSummary', { combo: run.maxCombo || 0, air: Number(run.airTime || 0).toFixed(1) })]
        : [t('mode.' + run.mode), timeString(run.time)];
      const text = [...details, personalBest ? t('mode.historyPersonalBest') : null,
        ghost ? t('mode.historyGhost') : null, shortDate(run.date)].filter(Boolean).join(' · ');
      return { mode: run.mode, personalBest, ghost, text };
    });
    updateHistoryView({ modeHistoryEmpty: modes.length === 0, modeRuns });
    const stats = careerStats(sessionHistory);
    const count = (key: string, n: number) => t(n === 1 ? `${key}.one` : key, { n }); // English singular; zh-TW keys read the same
    const careerSummary = t('history.career', { races: count('history.races', stats.races), wins: count('history.wins', stats.wins), km: (stats.totalDistance / 1000).toFixed(1), combo: stats.longestCombo, rings: stats.mostRings });
    const best = Math.min(sessionBests[trackId] ?? Infinity, ...runs.map(run => run.time));
    const recent = runs.slice(-10);
    const points = historyTrendPoints(recent);
    updateHistoryView({
      careerSummary,
      historyEmpty: runs.length === 0,
      trendVisible: recent.length !== 0,
      trendLabel: count('history.trend', recent.length),
      trendPolyPoints: points.map(point => point.join(',')).join(' '),
      trendCircles: points.map(([x, y], i) => ({ x, y, title: timeString(recent[i].time) })),
    });
    // Vue interpolation keeps all persisted fields escaped, including legacy records.
    const historyRuns = [...runs].reverse().map(run => {
      const fields = [
        shortDate(run.date), timeString(run.time),
        t('history.position', { n: typeof run.position === 'number' && Number.isInteger(run.position) && run.position >= 1 && run.position <= 4 ? run.position : '—' }),
      ];
      const number = (value?: number): number => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
      const detail = t('history.detail', {
        score: number(run.score), contacts: number(run.collisions), near: number(run.nearMisses),
        rings: number(run.rings), perfect: number(run.perfectLines), nitro: number(run.nitroUses),
      });
      return { fields, best: run.time === best, bestLabel: t('history.best'), detail };
    });
    updateHistoryView({ historyRuns });
    const today = dailyChallenge();
    const board: Array<Pick<SavedDailyRace, 'time' | 'position' | 'score'>> = dailyBoard(sessionDaily, today.id).slice(0, 5);
    updateHistoryView({
      dailyStatus: t('daily.status', { track: trackName(today.track, getLocale()), modifier: t('modifier.' + today.modifier) }),
      dailyStartDisabled: !world,
      dailyBoard: board.length
        ? board.map((run, i) => t('daily.line', {
          rank: i + 1, time: timeString(run.time), position: run.position, score: Math.round(run.score),
        })) : [t('daily.empty')],
    });
    const medalAwards = Object.fromEntries(MEDALS.map(id => [
      id, sessionMedals[id] ? t('medal.awarded', { date: shortDate(sessionMedals[id]) }) : null,
    ]));
    updateHistoryView({
      medalAwards,
      medalNotAwarded: t('medal.notAwarded'),
      achievementStatus: t('medal.count', { n: Object.keys(sessionMedals).length }),
    });
  }
  // Home status: today's challenge and the medal tally sit on the start screen instead of inside History.
  function showHomeStatus() {
    const { sessionDaily, sessionMedals, world } = getData();
    const today = dailyChallenge();
    const best = dailyBoard(sessionDaily, today.id)[0];
    $('#daily-card-route').textContent = `${trackName(today.track, getLocale())} · ${t(`modifier.${today.modifier}`)}`;
    $('#daily-card-best').textContent = best ? t('daily.best', { time: timeString(best.time), position: best.position }) : t('daily.fresh');
    document.querySelector<HTMLButtonElement>('#daily-card-start')!.disabled = !world;
    const medals = Object.keys(sessionMedals).length;
    $('#medal-count').textContent = `${medals}/${MEDALS.length}`;
    $('#medal-chip').setAttribute('aria-label', t('medal.count', { n: medals }));
    $('#medal-chip').classList.toggle('has-medals', medals > 0);
  }
  
  return { showHistory, showHomeStatus };
}
