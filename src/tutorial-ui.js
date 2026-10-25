import { t } from './i18n.js';
import { TUTORIAL_STEPS } from './interactive-tutorial.js';

export function tutorialHintKey(step, steerMode, flyMode) {
  const action = step === 'land' ? 'fly' : step;
  if (['left', 'right', 'brake'].includes(step) && steerMode === 'slide') return 'tutorial.slide.' + step;
  if (['left', 'right'].includes(step) && steerMode === 'tilt') return 'tutorial.tilt.' + step;
  if (step === 'land') return flyMode === 'toggle' ? 'tutorial.touch.landToggle' : 'tutorial.touch.land';
  if (step === 'fly' && flyMode === 'toggle') return 'tutorial.touch.flyToggle';
  return 'tutorial.touch.' + action;
}

export function setupTutorialUI({ getTutorial, getRace, getTouchMatches, getInputPrefs, getControlPrefs, showKeyMap }) {
  const $ = selector => document.querySelector(selector);
  let tutorialView = '';
  function renderTutorial(force = false) {
    const tutorial = getTutorial();
    if (!tutorial) return;
    const race = getRace(), touchPreference = { matches: getTouchMatches() }, inputPrefs = getInputPrefs(), controlPrefs = getControlPrefs();
    $('#tutorial-progress').value = tutorial.index + (tutorial.complete ? 0 : tutorial.progress);
    const view = `${tutorial.step}/${race.phase}/${touchPreference.matches}/${inputPrefs.mode}/${controlPrefs.flyMode}`;
    if (!force && tutorialView === view) return;
    tutorialView = view;
    const step = tutorial.step;
    const done = tutorial.complete;
    const action = step === 'land' ? 'fly' : step;
    $('#tutorial-coach').dataset.step = step ?? 'complete';
    $('#tutorial-title').textContent = done ? t('tutorial.complete') : t('tutorial.step', { n: tutorial.index + 1, total: TUTORIAL_STEPS.length, action: t(step === 'land' ? 'tutorial.landTitle' : `keymap.${step}`) });
    $('#tutorial-instruction').textContent = t(done ? 'tutorial.completedCopy' : race.phase === 'paused' ? 'tutorial.paused' : `tutorial.${step}`);
    $('#tutorial-pause').textContent = t(race.phase === 'paused' ? 'tutorial.resume' : 'tutorial.pause');
    $('#tutorial-pause').hidden = done;
    $('#tutorial-complete-actions').hidden = !done;
    $('#tutorial-assist').hidden = done;
    const hint = $('#tutorial-input');
    hint.removeAttribute('data-keys'); hint.replaceChildren();
    for (const target of document.querySelectorAll('.tutorial-target')) target.classList.remove('tutorial-target');
    if (done) return;
    if (!touchPreference.matches) {
      hint.dataset.keys = action;
      showKeyMap();
    } else {
      let target = $('#touch-controls [data-control="' + action + '"]');
      if (['left', 'right', 'brake'].includes(step) && inputPrefs.mode === 'slide') target = $('.touch-pad');
      hint.textContent = t(tutorialHintKey(step, inputPrefs.mode, controlPrefs.flyMode));
      target?.classList.add('tutorial-target');
    }
  }
  
  return { renderTutorial, resetTutorialView: () => { tutorialView = ''; } };
}
