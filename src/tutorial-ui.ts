import { nextTick } from 'vue';
import { updateCoachView } from './tutorial-coach-state.ts';
import { t } from './i18n.js';
import { TUTORIAL_STEPS } from './interactive-tutorial.js';

interface TutorialSnapshot {
  index: number;
  complete: boolean;
  progress: number;
  step: string | null;
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
  const action = step === 'land' ? 'fly' : step;
  if (['left', 'right', 'brake'].includes(step ?? '') && steerMode === 'slide') return 'tutorial.slide.' + step;
  if (['left', 'right'].includes(step ?? '') && steerMode === 'tilt') return 'tutorial.tilt.' + step;
  if (step === 'land') return flyMode === 'toggle' ? 'tutorial.touch.landToggle' : 'tutorial.touch.land';
  if (step === 'fly' && flyMode === 'toggle') return 'tutorial.touch.flyToggle';
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
    const view = [tutorial.step, race.phase, touch, inputPrefs.mode, controlPrefs.flyMode].join('/');
    if (!force && tutorialView === view) return;
    tutorialView = view;
    const step = tutorial.step;
    const done = tutorial.complete;
    const action = step === 'land' ? 'fly' : step;
    updateCoachView({
      step: step ?? 'complete',
      title: done ? t('tutorial.complete') : t('tutorial.step', {
        n: tutorial.index + 1,
        total: TUTORIAL_STEPS.length,
        action: t(step === 'land' ? 'tutorial.landTitle' : 'keymap.' + step),
      }),
      instruction: t(done ? 'tutorial.completedCopy' : race.phase === 'paused' ? 'tutorial.paused' : 'tutorial.' + step),
      pauseText: t(race.phase === 'paused' ? 'tutorial.resume' : 'tutorial.pause'),
      pauseHidden: done,
      completeActionsHidden: !done,
      assistHidden: done,
      hintKeys: done || touch ? '' : action ?? '',
      hintText: !done && touch ? t(tutorialHintKey(step, inputPrefs.mode, controlPrefs.flyMode)) : '',
    });
    for (const target of document.querySelectorAll<HTMLElement>('.tutorial-target')) target.classList.remove('tutorial-target');
    if (done) return;
    if (!touch) {
      nextTick(() => showKeyMap());
    } else {
      let target = $('#touch-controls [data-control="' + action + '"]');
      if (['left', 'right', 'brake'].includes(step ?? '') && inputPrefs.mode === 'slide') target = $('.touch-pad');
      target?.classList.add('tutorial-target');
    }
  }
  return { renderTutorial, resetTutorialView: () => { tutorialView = ''; } };
}
