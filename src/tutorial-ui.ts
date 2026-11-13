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
/** The player's live Controls settings that change what a hint must name. */
export interface HintControls { touch: boolean; steerMode: string; flyMode: string }
const KEYBOARD: HintControls = { touch: false, steerMode: 'buttons', flyMode: 'hold' };
// Copy naming a held FLY or the BRAKE button has a variant for the player's touch controls: toggle FLY is tapped on
// and off (keyboard FLY is always held: the setting only latches the touch button), and the slide pad, which tilt
// also brakes on, is pulled down. Variant keys append "Toggle" / "Slide".
const TOGGLE_FLY_COPY = new Set(['tutorial.airChain', 'tutorial.airChainAirborne', 'tutorial.airChainRetry.noBoost', 'tutorial.airChainRetry.short',
  'tutorial.airChainRetry.hard', 'tutorial.barrelRoll', 'tutorial.barrelRollRolling', 'tutorial.barrelRollRetry.hard', 'tutorial.touch.fly',
  'tutorial.touch.land', 'tutorial.touch.airChain', 'tutorial.touch.barrelRoll', 'tutorial.slide.barrelRoll', 'tutorial.tilt.barrelRoll',
  ...['chainFly', 'chainBoost', 'chainHold', 'chainLanding', 'chainRelease', 'rollFly', 'rollClimb', 'rollRelease', 'rollSpin', 'rollSoften'].map(cue => 'tutorial.cue.' + cue)]);
const PAD_BRAKE_COPY = new Set(['tutorial.brake', 'tutorial.brakeRetry.noBrake', 'tutorial.drift', 'tutorial.driftRetry.short', 'tutorial.driftRetry.slow',
  ...['brakeAhead', 'brakeHold', 'driftSpeed', 'driftStart', 'driftRelease', 'driftMax'].map(cue => 'tutorial.cue.' + cue)]);
function controlVariant(key: string, { touch, steerMode, flyMode }: HintControls): string {
  if (!touch) return key;
  if (flyMode === 'toggle' && TOGGLE_FLY_COPY.has(key)) return key + 'Toggle';
  return steerMode !== 'buttons' && PAD_BRAKE_COPY.has(key) ? key + 'Slide' : key;
}

/** Which coach line to show: a failed attempt names its reason, a cleared lesson celebrates before the next. */
export function tutorialInstructionKey(step: string | null, phase: string, reason: string | null | undefined, done: boolean, controls = KEYBOARD): string {
  if (done) return 'tutorial.completedCopy';
  if (phase === 'finishing') return 'tutorial.finishing';
  if (phase === 'cleared') return 'tutorial.cleared';
  if (phase === 'retry' && reason) return reason === 'missed' ? 'tutorial.gateMissed' : controlVariant(`tutorial.${step}Retry.${reason}`, controls);
  return controlVariant(PHASE_COPY[`${step}/${phase}`] ?? 'tutorial.' + step, controls);
}

/** Touch hint line: the steering surface's own copy (tilt brakes on the slide pad), then the FLY mode variant. */
export function tutorialHintKey(step: string | null, steerMode: string, flyMode: string): string {
  const surface = steerMode === 'buttons' || !['left', 'right', 'brake', 'drift', 'barrelRoll'].includes(step ?? '') ? 'touch'
    : step === 'brake' ? 'slide' : steerMode;
  return controlVariant(`tutorial.${surface}.${step}`, { touch: true, steerMode, flyMode });
}

/** Control to press now (phone outline) and the desktop key chips; both null while landing, when FLY must be released. */
export function tutorialHighlight(step: string | null, phase: string): { action: string | null; keys: string | null } {
  const action = step === 'land' ? null : step === 'airChain'
    ? phase === 'airborne' ? null : 'fly'
    : step === 'barrelRoll' ? (phase === 'ready' || phase === 'retry') ? 'fly' : null : step;
  const keys = step === 'drift' ? 'brake left right' : step === 'airChain' ? 'fly boost nitro' : step === 'barrelRoll' ? 'fly left right' : action;
  return { action, keys };
}

/** Touch control the coach outlines for this lesson, or null for none. */
export function tutorialTouchTarget(step: string | null, phase: string, steerMode: string, action: string | null): string | null {
  if (step === 'land') return null; // landing means releasing FLY: no outline or ripple on it
  // The slide pad is the whole lower-left of the screen: an outline there reads as a stray box, so it is never drawn.
  // Tilt hides the steering buttons and brakes on that same pad.
  if (steerMode !== 'buttons' && (['left', 'right', 'brake', 'drift'].includes(step ?? '') || step === 'barrelRoll' && phase === 'flicked')) return null;
  const control = action === 'drift' ? 'brake' : action; // buttons mode drifts on BRAKE plus an arrow
  return control ? '#touch-controls [data-control="' + control + '"]' : null;
}

/** Lesson name for titles and the pass toast. */
const lessonTitle = (step: string): string =>
  t(step === 'land' ? 'tutorial.landTitle' : step === 'airChain' || step === 'barrelRoll' || step === 'drift' ? 'tutorial.' + step + 'Title' : 'keymap.' + step);
/** True once per newly passed lesson of the practice it is given; a new practice starts from its own count. */
export function createClearChime(cue: (name: string) => void = () => {}) {
  let seen: TutorialSnapshot | null = null, count = 0;
  return (tutorial: TutorialSnapshot): boolean => {
    const clears = tutorial.clears ?? 0;
    if (tutorial !== seen) { seen = tutorial; count = clears; return false; }
    if (clears <= count) return false;
    count = clears;
    cue(tutorial.complete ? 'tutorial-complete' : 'gate-clear');
    return true;
  };
}
/** Coach copy split around NITRO rewards ("+0.25 NITRO", "0.25 格 NITRO") so the view can highlight them. */
export function rewardParts(text: string): { text: string; reward: boolean }[] {
  return text.split(/(\+?\d+(?:\.\d+)? (?:格 )?NITRO)/).filter(Boolean).map(part => ({ text: part, reward: /NITRO$/.test(part) && /\d/.test(part) }));
}
const NO_CUE = { cue: '', cueId: '', cueKeys: [] as string[], cueCount: '' };
/** Toast fields for a live cue: localized text, the bound desktop keys and the countdown. */
export function tutorialCueView(cue: TutorialCue | null | undefined, touch: boolean, flyMode: string, keyMap: KeyMap, steerMode = 'buttons'): typeof NO_CUE {
  if (!cue) return NO_CUE;
  const key = controlVariant(cue.key, { touch, steerMode, flyMode });
  return {
    cue: t(key, cue.n === undefined ? undefined : { n: cue.n }), cueId: key,
    cueKeys: touch ? [] : cue.actions.map(action => keyMap[action as DriveAction]?.[0]).filter((code): code is string => !!code)
      .map(code => keyLabel(code).replace(/^(Left|Right) Shift$/, 'Shift')),
    cueCount: cue.count === undefined ? '' : cue.count.toFixed(1) + 's',
  };
}

/** Phone controls that pulse now. The air chain follows its live cue so toast and ripple never disagree: FLY to take off,
 * then BOOST + NITRO (either counts, game.js) while FLY is held, nothing while releasing or landing. */
export function tutorialTouchControls(step: string | null, cue: TutorialCue | null | undefined, action: string | null): string[] {
  if (step !== 'airChain' || !cue) return action ? [action] : [];
  if (cue.key === 'tutorial.cue.chainFly') return ['fly'];
  return cue.actions.includes('boost') ? ['boost', 'nitro'] : [];
}

export function setupTutorialUI({
  getTutorial, getRace, getTouchMatches, getInputPrefs, getControlPrefs, showKeyMap, getKeyMap, cue: playCue,
}: TutorialDependencies) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  const progress = document.querySelector<HTMLProgressElement>('#tutorial-progress')!;
  let tutorialView = '';
  let keyMapSeen: KeyMap | null = null;
  const clearChime = createClearChime(playCue);
  // blur(): a focused button would otherwise re-fire on the Space/Enter keys the lessons use.
  trackProgressBottom($('#tutorial-coach'), document.documentElement, '--tutorial-coach-bottom');
  $('#tutorial-skip-step').addEventListener('click', event => { (event.currentTarget as HTMLElement).blur(); getTutorial()?.skip?.(); });
  function renderTutorial(force = false): void {
    const tutorial = getTutorial();
    if (!tutorial) return;
    const race = getRace(), touch = getTouchMatches(), inputPrefs = getInputPrefs(), controlPrefs = getControlPrefs(), keyMap = getKeyMap();
    const controls = { touch, steerMode: inputPrefs.mode, flyMode: controlPrefs.flyMode };
    if (keyMap !== keyMapSeen) { keyMapSeen = keyMap; force = true; } // a rebind redraws the key chips
    progress.value = tutorial.index + (tutorial.complete ? 0 : tutorial.progress);
    clearChime(tutorial);
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
    const { action, keys } = tutorialHighlight(step, phase);
    updateCoachView({
      step: step ?? 'complete',
      title: done ? t('tutorial.complete') : t('tutorial.step', {
        n: tutorial.index + 1,
        total: TUTORIAL_STEPS.length,
        action: lessonTitle(step ?? ''),
      }),
      instruction: t(tutorialInstructionKey(step, phase, tutorial.coachReason, done, controls)), // paused: the pause screen says so
      completeActionsHidden: !done,
      assistHidden: done,
      hintKeys: done || touch ? '' : keys ?? '',
      hintText: !done && touch ? t(tutorialHintKey(step, inputPrefs.mode, controlPrefs.flyMode)) : '',
      celebration: done ? t('tutorial.freeDrive') : '',
      guide: done || race.phase === 'countdown' ? '' : tutorial.guide ?? '', // the arrow starts at GO, with the throttle cue
      skipHidden: done || race.phase === 'paused',
      ...tutorialCueView(cue, touch, controlPrefs.flyMode, keyMap, inputPrefs.mode),
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
      for (const control of tutorialTouchControls(step, cue, action)) {
        const target = tutorialTouchTarget(step, phase, inputPrefs.mode, control);
        if (target) $(target)?.classList.add('tutorial-target');
      }
    }
  }
  return { renderTutorial, resetTutorialView: () => { tutorialView = ''; } };
}
