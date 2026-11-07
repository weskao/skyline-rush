import { nextTick } from 'vue';
import { updateCoachView } from './tutorial-coach-state.ts';
import { t } from './i18n.ts';
import { TUTORIAL_STEPS } from './interactive-tutorial.ts';
import { trackProgressBottom } from './hud-progress-offset.ts';
import { keyLabel } from './keymap-ui.ts';
import type { KeyMap, DriveAction } from './key-map.ts';
import type { TutorialCue } from './tutorial-cues.ts';

interface TutorialSnapshot {
  index: number;
  complete: boolean;
  progress: number;
  step: string | null;
  coachPhase?: string;
  coachReason?: string | null;
  guide?: string;
  cue?: TutorialCue | null;
  clears?: number;
  clearedStep?: string | null;
  clearedReward?: number;
  skip?(): void;
}
interface TutorialDependencies {
  getTutorial(): TutorialSnapshot | null;
  getRace(): { phase: string };
  getTouchMatches(): boolean;
  getInputPrefs(): { mode: string };
  getControlPrefs(): { flyMode: string };
  showKeyMap(): void;
  getKeyMap(): KeyMap;
  /** Plays a named sound effect (audio.js); muted audio stays silent there. */
  cue(name: string): void;
}

const PHASE_COPY: Readonly<Record<string, string>> = {
  'nitro/sprinting': 'tutorial.nitroSprint', 'nitro/retry': 'tutorial.nitroRetry',
  'airChain/airborne': 'tutorial.airChainAirborne', 'barrelRoll/readyToLand': 'tutorial.barrelRollReadyToLand',
  'barrelRoll/rolling': 'tutorial.barrelRollRolling', 'barrelRoll/flicked': 'tutorial.barrelRollFlicked',
};
/** Which coach line to show: a failed attempt names its reason, a cleared lesson celebrates before the next. */
export function tutorialInstructionKey(step: string | null, phase: string, reason: string | null | undefined, done: boolean): string {
  if (done) return 'tutorial.completedCopy';
  if (phase === 'finishing') return 'tutorial.finishing';
  if (phase === 'cleared') return 'tutorial.cleared';
  if (phase === 'retry' && reason) return reason === 'missed' ? 'tutorial.gateMissed' : `tutorial.${step}Retry.${reason}`;
  return PHASE_COPY[`${step}/${phase}`] ?? 'tutorial.' + step;
}

export function tutorialHintKey(step: string | null, steerMode: string, flyMode: string): string {
  const action = step === 'drift' ? 'brake' : step === 'land' ? 'fly' : step === 'airChain' ? 'boost' : step === 'barrelRoll' ? 'left' : step;
  if (['left', 'right', 'brake'].includes(step ?? '') && steerMode === 'slide') return 'tutorial.slide.' + step;
  if (['left', 'right'].includes(step ?? '') && steerMode === 'tilt') return 'tutorial.tilt.' + step;
  if (step === 'land') return flyMode === 'toggle' ? 'tutorial.touch.landToggle' : 'tutorial.touch.land';
  if (step === 'fly' && flyMode === 'toggle') return 'tutorial.touch.flyToggle';
  if (step === 'drift') return steerMode === 'slide' ? 'tutorial.slide.drift' : steerMode === 'tilt' ? 'tutorial.tilt.drift' : 'tutorial.touch.drift';
  if (step === 'airChain') return 'tutorial.touch.airChain';
  if (step === 'barrelRoll') return steerMode === 'slide' ? 'tutorial.slide.barrelRoll'
    : steerMode === 'tilt' ? 'tutorial.tilt.barrelRoll' : 'tutorial.touch.barrelRoll';
  return 'tutorial.touch.' + action;
}

/** Touch control the coach outlines for this lesson, or null for none. */
export function tutorialTouchTarget(step: string | null, phase: string, steerMode: string, action: string | null): string | null {
  if (steerMode === 'slide') {
    if (step === 'left') return null; // the pad box covered the left side of phone screens during Turn left
    if (['right', 'brake', 'drift'].includes(step ?? '') || step === 'barrelRoll' && phase === 'flicked') return '.touch-pad';
  }
  return action ? '#touch-controls [data-control="' + action + '"]' : null;
}

/** Lesson name for titles and the pass toast. */
const lessonTitle = (step: string): string =>
  t(step === 'land' ? 'tutorial.landTitle' : step === 'airChain' || step === 'barrelRoll' || step === 'drift' ? 'tutorial.' + step + 'Title' : 'keymap.' + step);
/** True once per newly passed lesson of the practice it is given; a new practice starts from its own count. */
export function createClearChime() {
  let seen: TutorialSnapshot | null = null, count = 0;
  return (tutorial: TutorialSnapshot): boolean => {
    const clears = tutorial.clears ?? 0;
    if (tutorial !== seen) { seen = tutorial; count = clears; return false; }
    if (clears <= count) return false;
    count = clears;
    return true;
  };
}
/** Coach copy split around NITRO rewards ("+0.25 NITRO", "0.25 格 NITRO") so the view can highlight them. */
export function rewardParts(text: string): { text: string; reward: boolean }[] {
  return text.split(/(\+?\d+(?:\.\d+)? (?:格 )?NITRO)/).filter(Boolean).map(part => ({ text: part, reward: /NITRO$/.test(part) && /\d/.test(part) }));
}
const NO_CUE = { cue: '', cueId: '', cueKeys: [] as string[], cueCount: '' };
/** Toast fields for a live cue: localized text, the bound desktop keys and the countdown. */
export function tutorialCueView(cue: TutorialCue | null | undefined, touch: boolean, flyMode: string, keyMap: KeyMap): typeof NO_CUE {
  if (!cue) return NO_CUE;
  const key = cue.key === 'tutorial.cue.chainRelease' && flyMode === 'toggle' ? 'tutorial.cue.chainReleaseToggle' : cue.key;
  return {
    cue: t(key, cue.n === undefined ? undefined : { n: cue.n }), cueId: key,
    cueKeys: touch ? [] : cue.actions.map(action => keyMap[action as DriveAction]?.[0]).filter((code): code is string => !!code)
      .map(code => keyLabel(code).replace(/^(Left|Right) Shift$/, 'Shift')),
    cueCount: cue.count === undefined ? '' : cue.count.toFixed(1) + 's',
  };
}

export function setupTutorialUI({
  getTutorial, getRace, getTouchMatches, getInputPrefs, getControlPrefs, showKeyMap, getKeyMap, cue: playCue,
}: TutorialDependencies) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  const progress = document.querySelector<HTMLProgressElement>('#tutorial-progress')!;
  let tutorialView = '';
  const clearChime = createClearChime();
  // blur(): a focused button would otherwise re-fire on the Space/Enter keys the lessons use.
  trackProgressBottom($('#tutorial-coach'), document.documentElement, '--tutorial-coach-bottom');
  $('#tutorial-skip-step').addEventListener('click', event => { (event.currentTarget as HTMLElement).blur(); getTutorial()?.skip?.(); });
  function renderTutorial(force = false): void {
    const tutorial = getTutorial();
    if (!tutorial) return;
    const race = getRace(), touch = getTouchMatches(), inputPrefs = getInputPrefs(), controlPrefs = getControlPrefs();
    progress.value = tutorial.index + (tutorial.complete ? 0 : tutorial.progress);
    if (clearChime(tutorial)) playCue('gate-clear'); // the same chime as a cleared checkpoint gate
    const passed = race.phase === 'racing' ? tutorial.clearedStep ?? null : null;
    // While the pass toast is up it holds the cue's place; a paused race shows the pause screen instead.
    const cue = race.phase === 'racing' && !tutorial.complete && !passed ? tutorial.cue : null;
    const view = [passed, tutorial.step, tutorial.coachPhase, tutorial.coachReason, tutorial.guide, race.phase, touch, inputPrefs.mode, controlPrefs.flyMode, cue?.key, cue?.n, cue?.count].join('/');
    if (!force && tutorialView === view) return;
    tutorialView = view;
    const step = tutorial.step;
    const done = tutorial.complete;
    const phase = tutorial.coachPhase ?? 'ready';
    // Only highlight a control if pressing it is appropriate *now*.
    // Landing and finished-roll phases must not highlight BOOST or FLY.
    const action = step === 'land' ? 'fly' : step === 'airChain'
      ? phase === 'airborne' ? null : 'fly'
      : step === 'barrelRoll' ? (phase === 'ready' || phase === 'retry') ? 'fly' : null : step;
    const keys = step === 'drift' ? 'brake left right' : step === 'airChain' ? 'fly boost nitro' : step === 'barrelRoll' ? 'fly left right' : action;
    updateCoachView({
      step: step ?? 'complete',
      title: done ? t('tutorial.complete') : t('tutorial.step', {
        n: tutorial.index + 1,
        total: TUTORIAL_STEPS.length,
        action: lessonTitle(step ?? ''),
      }),
      instruction: t(tutorialInstructionKey(step, phase, tutorial.coachReason, done)), // paused: the pause screen says so
      completeActionsHidden: !done,
      assistHidden: done,
      hintKeys: done || touch ? '' : keys ?? '',
      hintText: !done && touch ? t(tutorialHintKey(step, inputPrefs.mode, controlPrefs.flyMode)) : '',
      celebration: done ? t('tutorial.freeDrive') : '',
      guide: done ? '' : tutorial.guide ?? '',
      skipHidden: done || race.phase === 'paused',
      ...tutorialCueView(cue, touch, controlPrefs.flyMode, getKeyMap()),
      passed: passed ? t('tutorial.passed', { action: lessonTitle(passed) }) : '',
      passedReward: passed && tutorial.clearedReward ? t('tutorial.passedReward', { n: tutorial.clearedReward }) : '',
    });
    // Point at the NITRO meter (and touch button) while a lesson's NITRO payout is announced.
    if (passed && tutorial.clearedReward) document.body.dataset.tutorialReward = 'nitro';
    else delete document.body.dataset.tutorialReward;
    for (const target of document.querySelectorAll<HTMLElement>('.tutorial-target')) target.classList.remove('tutorial-target');
    if (done) return;
    if (!touch) {
      nextTick(() => showKeyMap());
    } else {
      const target = tutorialTouchTarget(step, phase, inputPrefs.mode, action);
      if (target) $(target)?.classList.add('tutorial-target');
    }
  }
  return { renderTutorial, resetTutorialView: () => { tutorialView = ''; } };
}
