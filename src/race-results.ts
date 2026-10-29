import { RACE_TRACKS } from './game.js';
import { recordRace, recordBest, recordModeRace, loadModeHistory, recordMedals, recordStars, recordDaily, dailyBoard, LEGACY_BEST_KEY } from './history.ts';
import { addSprintStage, sprintTotal, type SprintSeries } from './sprint-series.ts';
import { addCupResult, cupStandings, cupComplete, cupTotalTime, type CupState } from './championship-cup.ts';
import { validGhost, type GhostSample } from './ghost.ts';
import type { SessionProgress } from './session-progress.ts';
import type { createGhostStore } from './ghost-store.ts';
import { recordChallengeMedals, type ChallengeMedalId } from './history-challenge-medals.ts';
import { addStuntHeat, stuntHeatContinues, type StuntRun } from './stunt-attack.ts';
export interface RaceSeries { sprintSeries: SprintSeries | null; cup: CupState | null; stunt: StuntRun | null }
// The simulation race comes from plain-JS game.js; each history.ts writer validates the fields it stores.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FinishedRace = any;
interface SettleContext {
  series: RaceSeries;
  progress: SessionProgress;
  ghosts: ReturnType<typeof createGhostStore>;
  /** The Daily Challenge being raced (its modifier is on race.modifier). */
  daily: { id: string; track: string; modifier: string } | null;
  /** Ghost samples recorded during this race, or null when they belong to another race. */
  trace: GhostSample[] | null;
}
export interface Settlement {
  best: number;
  record: boolean;
  /** Medals earned for the first time by this run. */
  medals: string[];
  challengeMedals: ChallengeMedalId[];
  /** Track the NEXT button offers, when this run moved the campaign forward. */
  next: string | null;
  /** A heat inside a sprint series, cup or stunt run with more to come. */
  intermediateStage: boolean;
  series: RaceSeries;
}

// One settlement per race object: every restart builds a new race, so entries die with it.
const settled = new WeakMap<object, Settlement>();

/** Records a finished race once: series progress, medals, bests, unlocks, history and ghosts. */
export function settleRace(race: FinishedRace, context: SettleContext): Settlement {
  const previous = settled.get(race);
  if (previous) return previous; // pause, dialogs and phase refreshes must never double-award
  const settlement = settleOnce(race, context);
  settled.set(race, settlement);
  return settlement;
}

function settleOnce(race: FinishedRace, { series, progress, ghosts, daily, trace }: SettleContext): Settlement {
  let { sprintSeries, cup } = series;
  const { stunt } = series;
  if (sprintSeries && race.mode === 'custom') sprintSeries = addSprintStage(sprintSeries, race);
  if (cup && race.mode === 'cup') cup = addCupResult(cup, race);
  if (stunt && race.mode === 'stunt') addStuntHeat(stunt, race);
  const medals = (race.mode === 'classic' ? recordMedals(race.result) : []).filter(id => !progress.medals[id]); // history.ts swallows storage failures
  progress.medals = { ...progress.medals, ...Object.fromEntries(medals.map(id => [id, new Date().toISOString()])) };
  const trackId: string = race.trackId ?? 'coast';
  let best: number, record: boolean, next: string | null = null;
  const intermediateStage = !!((sprintSeries && sprintSeries.results.length < sprintSeries.count) || (cup && !cupComplete(cup)) ||
    (stunt && stuntHeatContinues(stunt, race.result.endReason)));
  if (intermediateStage) {
    best = 0; record = false; // A partial series never writes a misleading individual best.
  } else if (race.result.success === false && race.mode !== 'classic') {
    best = race.elapsed; record = false; // A missed gate or expired clock is a retry, not a saved best.
  } else if (race.mode === 'stunt' && stunt) {
    ({ best, record } = recordModeRace({ ...race, result: { ...race.result, time: stunt.elapsed, score: Math.round(stunt.score), maxCombo: stunt.maxCombo, airTime: stunt.airTime } }));
    progress.modeHistory = loadModeHistory();
  } else if (race.mode !== 'classic') {
    const total = cup ? cupTotalTime(cup) : sprintSeries ? sprintTotal(sprintSeries) : race.result.time;
    const modeRace = cup ? { ...race, trackId: cup.tracks[0], result: { ...race.result, time: total,
      score: cupStandings(cup).find(entry => entry.name === 'YOU')!.points } } : sprintSeries ? { ...race, result: { ...race.result, time: total,
      score: sprintSeries.results.reduce((score, stage) => score + stage.score, 0) } } : race;
    ({ best, record } = recordModeRace(modeRace));
    progress.modeHistory = loadModeHistory();
    if (['time', 'circuit'].includes(race.mode) && record) {
      const candidate = { time: race.elapsed, samples: trace ?? [] };
      if (trace && validGhost(candidate, trackId, race.config)) ghosts.saveMode(race, candidate);
    }
  } else if (race.modifier) {
    const run = recordDaily(daily!, race);
    progress.daily = [...progress.daily, run].slice(-50);
    const board = dailyBoard(progress.daily, daily!.id);
    best = board[0]!.time; record = board[0] === run;
  } else {
    const recordRun = recordRace(race);
    progress.history = [...progress.history, recordRun].slice(-50);
    const tracks = Object.keys(RACE_TRACKS);
    const following = tracks[tracks.indexOf(race.trackId) + 1];
    // NEXT drives progression only: hidden once every track was already open before this run.
    const campaignDone = tracks.every(id => progress.unlocked.has(id));
    if (following && race.result.position <= 3 && !progress.unlocked.has(following)) progress.unlocked.add(following);
    if (following && !campaignDone && progress.unlocked.has(following)) next = following;
    const saved = recordBest(trackId, race.elapsed);
    // Session bests keep "personal best" honest when storage is blocked.
    best = Math.min(saved.best, progress.bests[trackId] ?? Infinity);
    record = saved.record && !(progress.bests[trackId]! <= race.elapsed);
    progress.bests[trackId] = best;
    // The pre-tracks key stays readable for coast (older builds, browser test).
    if (record && trackId === 'coast') try { localStorage.setItem(LEGACY_BEST_KEY, String(best)); } catch { /* A blocked personal-best store never blocks the results. */ }
    recordStars(trackId, race.result.stars);
    progress.stars[trackId] = Math.max(progress.stars[trackId] ?? 0, race.result.stars);
    const ghost = { time: race.elapsed, samples: trace ?? [] };
    if (record && trace && validGhost(ghost, trackId)) ghosts.saveClassic(trackId, ghost);
  }
  if (race.mode === 'custom' && trace) ghosts.saveCustom(race, { time: race.elapsed, samples: trace });
  let challengeMedals: ChallengeMedalId[] = [];
  if (!intermediateStage) {
    const challenge = recordChallengeMedals(stunt ? { ...race, result: { ...race.result, time: stunt.elapsed }, styleAttack: stunt } : race, progress.challengeMedals);
    progress.challengeMedals = challenge.state; challengeMedals = challenge.awarded;
  }
  return { best, record, medals, challengeMedals, next, intermediateStage, series: { sprintSeries, cup, stunt } };
}
