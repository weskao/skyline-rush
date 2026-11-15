import { nextTick } from 'vue';
import { applyI18n, t } from './i18n.ts';
import { guideView, updateGuideView } from './guide-view-state.ts';
import type { GuideView } from './ui-state-contracts.ts';

type GuideDevice = GuideView['selectedDevice'];
export const guidePracticeLabelKey = (completed: boolean): 'tutorial.start' | 'tutorial.retry' =>
  completed ? 'tutorial.retry' : 'tutorial.start';
export const guideDeviceForPointer = (touch: boolean): GuideDevice => touch ? 'mobile' : 'desktop';

interface GuideDependencies {
  beforeOpen: () => void;
  touchMatches: () => boolean;
  renderKeyMap: () => void;
  isTutorialActive: () => boolean;
  getSteeringMode: () => 'slide' | 'buttons' | 'tilt';
  onPractice: (firstStart?: boolean) => void;
  onPracticeExit: () => void;
  onRace: () => void;
  clearControls: () => void;
}

// Modal events are initialized once after Vue renders its shell.
// Input/tutor lifecycle remain in the game layer.
export function setupGuideUI({
  beforeOpen, touchMatches, renderKeyMap, isTutorialActive, getSteeringMode, onPractice, onRace, onPracticeExit, clearControls,
}: GuideDependencies) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  const guideScreen = document.querySelector<HTMLDialogElement>('#guide-screen')!;
  guideScreen.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.code === 'Escape') { event.preventDefault(); dismissGuide(); }
  });
  let guideOpener: HTMLElement | null = null;
  function selectGuideDevice(device: GuideDevice): void {
    updateGuideView({ selectedDevice: device });
  }
  function openGuide(opener: HTMLElement, firstStart = false, focusPractice = false): void {
    const key = firstStart ? 'tutorial.practiceFirst' : guidePracticeLabelKey(practiceCompleted());
    updateGuideView({ firstStart, steerMode: getSteeringMode(), practiceKey: key, practiceText: t(key) });
    guideOpener = opener;
    beforeOpen();
    selectGuideDevice(guideDeviceForPointer(touchMatches()));
    renderKeyMap();
    guideScreen.scrollTop = 0;
    guideScreen.showModal();
    void nextTick(() => {
      applyI18n(guideScreen);
      if (guideScreen.open) {
        const focusTarget = firstStart ? '#guide-cancel' : focusPractice ? '#guide-practice' : '#guide-close';
        $(focusTarget).focus({ preventScroll: true });
      }
    });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-guide-device]')) {
    button.addEventListener('click', () => {
      const device = button.dataset.guideDevice;
      if (device === 'desktop' || device === 'mobile' || device === 'items') selectGuideDevice(device);
    });
  }
  $('#guide-open').addEventListener('click', () => openGuide($('#controls-button')));
  $('#practice-button').addEventListener('click', event => {
    openGuide(event.currentTarget as HTMLElement, false, true);
  });
  function practiceCompleted(): boolean {
    try { return localStorage.getItem('skyline-rush-tutorial-completed') === '1'; }
    catch { return false; }
  }
  let guideSeen = practiceCompleted();
  try { guideSeen ||= localStorage.getItem('skyline-rush-guide-seen') === '1'; }
  catch { /* Offer practice once per page when storage is unavailable. */ }
  function closeGuide(): void {
    guideSeen = true;
    try { localStorage.setItem('skyline-rush-guide-seen', '1'); }
    catch { /* Closing stays usable when storage is blocked. */ }
    guideScreen.close();
  }
  function dismissGuide(): void {
    if (guideView.firstStart) guideScreen.close();
    else closeGuide();
  }
  $('#guide-close').addEventListener('click', dismissGuide);
  $('#guide-cancel').addEventListener('click', dismissGuide);
  $('#guide-practice').addEventListener('click', () => onPractice(guideView.firstStart));
  $('#tutorial-open').addEventListener('click', () => onPractice(false));
  $('#tutorial-retry').addEventListener('click', () => onPractice());
  for (const id of ['tutorial-exit', 'tutorial-done']) $(`#${id}`).addEventListener('click', onPracticeExit);
  $('#guide-start-race').addEventListener('click', () => {
    guideOpener = null;
    closeGuide();
    onRace();
  });
  guideScreen.addEventListener('cancel', event => { event.preventDefault(); dismissGuide(); });
  guideScreen.addEventListener('close', () => {
    if (isTutorialActive() || !guideOpener) return;
    clearControls();
    guideOpener.focus({ preventScroll: true });
  });
  return {
    closeGuide,
    offerFirstStart(): boolean {
      if (guideSeen) return false;
      openGuide($('#start-button'), true);
      return true;
    },
  };
}
