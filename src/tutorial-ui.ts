import { nextTick } from 'vue';
import { updateCoachView } from './tutorial-coach-state.ts';
import { t } from './i18n.ts';
import { TUTORIAL_STEPS } from './interactive-tutorial.ts';

interface TutorialSnapshot {
  index: number;
  complete: boolean;
  progress: number;
  step: string | null;
  coachPhase?: string;
}
interface TutorialDependencies {
  getTutorial(): TutorialSnapshot | null;
  getRace(): { phase: string };
  getTouchMatches(): boolean;
  getInputPrefs(): { mode: string };
  getControlPrefs(): { flyMode: string };
  showKeyMap(): void;
}

export function tutorialHintKey(step: string | null, steerMode: string, flyMode: string): string {
  const action = step === 'land' ? 'fly' : step === 'airChain' ? 'boost' : step === 'barrelRoll' ? 'left' : step;
  if (['left', 'right', 'brake'].includes(step ?? '') && steerMode === 'slide') return 'tutorial.slide.' + step;
  if (['left', 'right'].includes(step ?? '') && steerMode === 'tilt') return 'tutorial.tilt.' + step;
  if (step === 'land') return flyMode === 'toggle' ? 'tutorial.touch.landToggle' : 'tutorial.touch.land';
  if (step === 'fly' && flyMode === 'toggle') return 'tutorial.touch.flyToggle';
  if (step === 'airChain') return 'tutorial.touch.airChain';
  if (step === 'barrelRoll') return steerMode === 'slide' ? 'tutorial.slide.barrelRoll'
    : steerMode === 'tilt' ? 'tutorial.tilt.barrelRoll' : 'tutorial.touch.barrelRoll';
  return 'tutorial.touch.' + action;
}

export function setupTutorialUI({
  getTutorial, getRace, getTouchMatches, getInputPrefs, getControlPrefs, showKeyMap,
}: TutorialDependencies) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  const progress = document.querySelector<HTMLProgressElement>('#tutorial-progress')!;
  let tutorialView = '';
  function renderTutorial(force = false): void {
    const tutorial = getTutorial();
    if (!tutorial) return;
    const race = getRace(), touch = getTouchMatches(), inputPrefs = getInputPrefs(), controlPrefs = getControlPrefs();
    progress.value = tutorial.index + (tutorial.complete ? 0 : tutorial.progress);
    const view = [tutorial.step, tutorial.coachPhase, race.phase, touch, inputPrefs.mode, controlPrefs.flyMode].join('/');
    if (!force && tutorialView === view) return;
    tutorialView = view;
    const step = tutorial.step;
    const done = tutorial.complete;
    const phase = tutorial.coachPhase ?? 'ready';
    // Only highlight a control if pressing it is appropriate *now*.
    // Landing and finished-roll phases must not highlight BOOST or FLY.
    const action = step === 'land' ? 'fly' : step === 'airChain'
      ? phase === 'airborne' ? null : 'fly'
      : step === 'barrelRoll' ? phase === 'ready' ? 'fly' : null : step;
    const keys = step === 'airChain' ? 'fly boost' : step === 'barrelRoll' ? 'fly left right' : action;
    updateCoachView({
      step: step ?? 'complete',
      title: done ? t('tutorial.complete') : t('tutorial.step', {
        n: tutorial.index + 1,
        total: TUTORIAL_STEPS.length,
        action: t(step === 'land' ? 'tutorial.landTitle' : step === 'airChain' || step === 'barrelRoll' ? 'tutorial.' + step + 'Title' : 'keymap.' + step),
      }),
      instruction: t(done ? 'tutorial.completedCopy' : race.phase === 'paused' ? 'tutorial.paused' :
        step === 'nitro' && phase === 'sprinting' ? 'tutorial.nitroSprint' :
        step === 'airChain' && phase === 'airborne' ? 'tutorial.airChainAirborne' :
        step === 'barrelRoll' && phase === 'readyToLand' ? 'tutorial.barrelRollReadyToLand' :
        step === 'barrelRoll' && phase === 'rolling' ? 'tutorial.barrelRollRolling' :
        step === 'barrelRoll' && phase === 'flicked' ? 'tutorial.barrelRollFlicked' : 'tutorial.' + step),
      pauseText: t(race.phase === 'paused' ? 'tutorial.resume' : 'tutorial.pause'),
      pauseHidden: done,
      completeActionsHidden: !done,
      assistHidden: done,
      hintKeys: done || touch ? '' : keys ?? '',
      hintText: !done && touch ? t(tutorialHintKey(step, inputPrefs.mode, controlPrefs.flyMode)) : '',
    });
    for (const target of document.querySelectorAll<HTMLElement>('.tutorial-target')) target.classList.remove('tutorial-target');
    if (done) return;
    if (!touch) {
      nextTick(() => showKeyMap());
    } else {
      let target = action ? $('#touch-controls [data-control="' + action + '"]') : null;
      if ((['left', 'right', 'brake'].includes(step ?? '') || step === 'barrelRoll' && phase === 'flicked') && inputPrefs.mode === 'slide') target = $('.touch-pad');
      target?.classList.add('tutorial-target');
    }
  }
  return { renderTutorial, resetTutorialView: () => { tutorialView = ''; } };
}
