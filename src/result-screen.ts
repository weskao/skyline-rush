import { loadCircuitLapBest } from './circuit-records.ts';
import { t, trackName, getLocale } from './i18n.ts';
import { icon } from './icons.ts';
import { timeString } from './time-format.ts';
import { stuntMedal, stuntHeatContinues } from './stunt-attack.ts';
import { sprintTotal, type SprintSeries } from './sprint-series.ts';
import { cupStandings, cupComplete, cupTotalTime, type CupState } from './championship-cup.ts';
import type { ChallengeMedalId } from './history-challenge-medals.ts';
import type { StuntRun } from './stunt-attack.ts';

// The simulation race comes from plain-JS game.js; only its finished result fields are read here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FinishedRace = any;
export interface FinishedResult {
  best: number; record: boolean; medals: string[];
  challengeMedals?: readonly ChallengeMedalId[];
  series: SprintSeries | null; cup: CupState | null; stunt: StuntRun | null;
  /** Track the NEXT button offers, if any. */
  next: string | null;
}
type CountFormat = 'time' | 'style';
export interface ResultView {
  title: string;
  copy: string;
  /** Result stat rows (static markup built from translated strings and numbers). */
  stats: string;
  nextStage?: string;
  nextTrack?: string;
  style?: { aria: string; html: string };
  /** Values that count up on reveal, in stat order: time, best, style score. */
  counts: { value: number; format: CountFormat }[];
}
const row = (label: string, value: string | number): string => `<div><span>${label}</span><strong>${value}</strong></div>`;

function eliminationView(race: FinishedRace): ResultView {
  const { result } = race;
  return {
    title: t(result.success ? 'mode.eliminationWon' : 'mode.eliminationLost'),
    copy: t('mode.eliminationSummary', { n: race.elimination.eliminated.length }),
    stats: `<div><span>${t('mode.eliminationPosition')}</span><strong>${result.position} / 4</strong></div>
      <div><span>${t('mode.totalTime')}</span><strong>${timeString(result.time)}</strong></div>`,
    counts: [],
  };
}
function stuntView(race: FinishedRace, { best, stunt }: FinishedResult): ResultView {
  const run = stunt!;
  const continuing = stuntHeatContinues(run, race.result.endReason);
  const left = Math.max(0, run.duration - run.elapsed);
  const medal = continuing ? null : stuntMedal(run.score, run.duration);
  return {
    title: t(continuing ? 'mode.stuntHeatEnd' : 'mode.stuntComplete'),
    copy: t('mode.stuntSummary', { heats: run.heats, max: run.maxCombo, air: run.airTime.toFixed(1) }),
    ...(continuing ? { nextStage: t('mode.stuntNext', { sec: Math.ceil(left) }) } : {}),
    stats: row(t('mode.stuntPoints'), Math.round(run.score)) + row(t('mode.stuntTime'), `${Math.floor(run.elapsed)} / ${run.duration} s`) +
      (continuing ? '' : row(t('mode.stuntBest'), Math.round(best)) + row(t('mode.stuntMedal'), medal ? t('mode.medal.' + medal) : t('mode.medal.none'))),
    counts: [],
  };
}
function cupView(_race: FinishedRace, { cup }: FinishedResult): ResultView {
  const finishedCup = cup!;
  const standings = cupStandings(finishedCup);
  const complete = cupComplete(finishedCup);
  const you = standings.find(entry => entry.name === 'YOU')!;
  return {
    title: t(complete ? standings[0]!.name === 'YOU' ? 'mode.cupWon' : 'mode.cupComplete' : 'mode.cupStage', {
      n: finishedCup.results.length, total: finishedCup.tracks.length,
    }),
    copy: standings.map(({ name, points }, i) => `${i + 1}. ${name} · ${points} ${t('mode.cupPts')}`).join('  ·  '),
    nextStage: complete ? '' : t('mode.cupNext', { track: trackName(finishedCup.tracks[finishedCup.results.length]!, getLocale()) }),
    stats: row(t('mode.cupPts'), you.points) + row(t('mode.totalTime'), timeString(cupTotalTime(finishedCup))),
    counts: [],
  };
}
function stageView(race: FinishedRace, { series }: FinishedResult): ResultView {
  const sprint = series!;
  const index = sprint.results.length;
  return {
    title: t('mode.stageComplete', { n: index, total: sprint.count }),
    copy: t('mode.stageContinue'),
    nextStage: t('mode.nextStage', { n: index + 1, total: sprint.count }),
    stats: row(t('mode.stageTime'), timeString(race.elapsed)) + row(t('mode.totalTime'), timeString(sprintTotal(sprint))),
    counts: [],
  };
}
function cleanFailedView(race: FinishedRace): ResultView {
  return {
    title: t('mode.cleanFailed'),
    copy: t('mode.cleanFailedCopy', { n: race.result.collisions }),
    stats: row(t('mode.collision'), race.result.collisions) + row(t('result.yourTime'), timeString(race.elapsed)),
    counts: [],
  };
}
function checkpointFailedView(race: FinishedRace): ResultView {
  const { passed, gates, perfect } = race.checkpoint;
  return {
    title: t('mode.checkpointFailed'),
    copy: t('mode.checkpointFailedCopy', { n: passed, total: gates.length }),
    stats: row(t('mode.gates'), `${passed} / ${gates.length} · ${t('mode.perfect')}: ${perfect}`) + row(t('mode.totalTime'), timeString(race.elapsed)),
    counts: [],
  };
}
function standardView(race: FinishedRace, { best, record, medals, series, next }: FinishedResult): ResultView {
  const { result } = race;
  const displayedTime = series ? sprintTotal(series) : race.elapsed;
  return {
    title: series ? t('mode.seriesComplete') : race.mode !== 'classic' ? t('mode.resultTitle') : t(result.position === 1 ? 'overlay.winTitle' : 'overlay.finishTitle'),
    copy: t(record ? 'overlay.recordCopy' : 'overlay.againCopy') + t('overlay.summary', { near: result.nearMisses, contacts: result.collisions })
      + (race.mode === 'gauntlet' ? ' ' + t('mode.hazardResult', { n: race.hazards.filter((h: { passed: boolean }) => h.passed).length, total: race.hazards.length }) : '')
      + (medals.length ? t('overlay.medal', { list: medals.map(id => t(`medal.${id}`)).join(t('list.separator')) }) : ''),
    ...(next ? { nextTrack: trackName(next, getLocale()) } : {}),
    stats: `<div><span>${t('race.position')}</span><strong>${race.rivals.length ? result.position : t('mode.solo')}<small> / ${race.rivals.length + 1}</small></strong></div>`
      + row(t('result.yourTime'), timeString(displayedTime)) + row(t('result.best'), timeString(best)),
    style: {
      aria: t('result.starsAria', { n: result.stars }),
      html: `<div class="style-stars" aria-hidden="true">${Array.from({ length: 3 }, (_, i) => `<span class="${i < result.stars ? 'earned' : ''}">${icon('star')}</span>`).join('')}</div><strong>${t('result.style', { score: result.score })}</strong><small>${t('result.styleHelp')}<br>${t('result.styleStars', { two: race.length * 0.25, three: race.length * 0.5 })}</small>`,
    },
    counts: [{ value: displayedTime, format: 'time' }, { value: best, format: 'time' }, { value: result.score, format: 'style' }],
  };
}

function endlessView(race: FinishedRace, { best, record }: FinishedResult): ResultView {
  return { title: t('mode.endlessFinished'), copy: t(record ? 'mode.endlessRecord' : 'mode.endlessSummary'),
    stats: row(t('mode.endlessDistance'), (race.result.distance / 1000).toFixed(2) + ' km') +
      row(t('mode.endlessBest'), (best / 1000).toFixed(2) + ' km') + row(t('mode.totalTime'), timeString(race.elapsed)), counts: [] };
}

function circuitView(race: FinishedRace, { best }: FinishedResult): ResultView {
  const times = race.circuit.player.lapTimes;
  return { title: t('circuit.complete'), copy: t('circuit.summary', { laps: race.config.laps }),
    stats: row(t('result.yourTime'), timeString(race.result.time)) + row(t('result.best'), timeString(best)) +
      row(t('circuit.best'), timeString(Math.min(loadCircuitLapBest(race.config) ?? Infinity, ...times.map((lap: { time: number }) => lap.time)))) +
      times.map((lap: { time: number }, i: number) => row(t('circuit.lapRow', { lap: i + 1 }), timeString(lap.time))).join(''), counts: [] };
}

// First match wins: mode-specific outcomes before the generic podium screen.
const VIEWS: [(race: FinishedRace, finished: FinishedResult) => unknown, (race: FinishedRace, finished: FinishedResult) => ResultView][] = [
  [race => race.mode === 'endless', endlessView],
  [race => race.mode === 'circuit', circuitView],
  [race => race.mode === 'elimination', eliminationView],
  [(_race, { stunt }) => stunt, stuntView],
  [(_race, { cup }) => cup, cupView],
  [(_race, { series }) => series && series.results.length < series.count, stageView],
  [race => race.mode === 'time' && !race.result.success, cleanFailedView],
  [race => race.mode === 'checkpoint' && !race.result.success, checkpointFailedView],
];
export function resultView(race: FinishedRace, finished: FinishedResult): ResultView {
  const view = (VIEWS.find(([applies]) => applies(race, finished))?.[1] ?? standardView)(race, finished);
  if (finished.challengeMedals?.length) view.copy += t('challengeMedal.new', {
    list: finished.challengeMedals.map(id => t(`challengeMedal.${id}`)).join(t('list.separator')),
  });
  return view;
}

export interface ResultCount { element: HTMLElement; value: number; format(value: number): string }
const FORMATS: Record<CountFormat, (value: number) => string> = {
  time: timeString,
  style: value => t('result.style', { score: Math.round(value) }),
};

/** Writes a result view into the race overlay; returns the elements whose numbers count up on reveal. */
export function setupResultScreen() {
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const title = $('#overlay-title'), copy = $('#overlay-copy'), stats = $('#result-stats');
  const nextStage = $('#next-stage'), nextTrack = $('#next-track'), style = $('#result-style');
  return function render(view: ResultView): ResultCount[] {
    title.textContent = view.title;
    copy.textContent = view.copy;
    if (view.nextStage !== undefined) nextStage.textContent = view.nextStage;
    if (view.nextTrack !== undefined) nextTrack.textContent = view.nextTrack;
    stats.innerHTML = view.stats;
    if (view.style) { style.setAttribute('aria-label', view.style.aria); style.innerHTML = view.style.html; }
    if (!view.counts.length) return [];
    const targets = [stats.children[1]!.querySelector('strong')!, stats.children[2]!.querySelector('strong')!, $('#result-style > strong')];
    return view.counts.map(({ value, format }, i) => ({ element: targets[i] as HTMLElement, value, format: FORMATS[format] }));
  };
}
