import { t } from './i18n.ts';
import { updateGuideView } from './guide-view-state.ts';

type GuideDevice = 'desktop' | 'mobile';
export const guidePracticeLabelKey = (completed: boolean): 'tutorial.start' | 'tutorial.retry' =>
  completed ? 'tutorial.retry' : 'tutorial.start';
export const guideDeviceForPointer = (touch: boolean): GuideDevice => touch ? 'mobile' : 'desktop';

interface GuideDependencies {
  beforeOpen: () => void;
  touchMatches: () => boolean;
  renderKeyMap: () => void;
  isTutorialActive: () => boolean;
  clearControls: () => void;
}

// Modal events are initialized once after Vue renders its shell.
// Input/tutor lifecycle remain in the game layer.
export function setupGuideUI({
  beforeOpen, touchMatches, renderKeyMap, isTutorialActive, clearControls,
}: GuideDependencies) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  const guideScreen = document.querySelector<HTMLDialogElement>('#guide-screen')!;
  guideScreen.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.code === 'Escape') { event.preventDefault(); closeGuide(); }
  });
  let guideOpener: HTMLElement | null = null;
  function selectGuideDevice(device: GuideDevice): void {
    updateGuideView({ selectedDevice: device });
  }
  function openGuide(opener: HTMLElement): void {
    try {
      const key = guidePracticeLabelKey(localStorage.getItem('skyline-rush-tutorial-completed') === '1');
      updateGuideView({ practiceKey: key, practiceText: t(key) });
    } catch { /* Keep the default invitation without storage. */ }
    guideOpener = opener;
    beforeOpen();
    selectGuideDevice(guideDeviceForPointer(touchMatches()));
    renderKeyMap();
    guideScreen.showModal();
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-guide-device]')) {
    button.addEventListener('click', () => {
      const device = button.dataset.guideDevice;
      if (device === 'desktop' || device === 'mobile') selectGuideDevice(device);
    });
  }
  $('#guide-open').addEventListener('click', () => openGuide($('#controls-button')));
  $('#practice-button').addEventListener('click', event => {
    openGuide(event.currentTarget as HTMLElement);
    $('#guide-practice').focus();
  });
  let guideSeen = false;
  try { guideSeen = localStorage.getItem('skyline-rush-guide-seen') === '1'; }
  catch { /* Offer practice once per page when storage is unavailable. */ }
  function closeGuide(): void {
    guideSeen = true;
    try { localStorage.setItem('skyline-rush-guide-seen', '1'); }
    catch { /* Closing stays usable when storage is blocked. */ }
    guideScreen.close();
  }
  $('#guide-close').addEventListener('click', closeGuide);
  guideScreen.addEventListener('cancel', event => { event.preventDefault(); closeGuide(); });
  guideScreen.addEventListener('close', () => {
    if (isTutorialActive()) return;
    clearControls();
    guideOpener?.focus({ preventScroll: true });
  });
  return { openGuide, closeGuide, hasSeenGuide: () => guideSeen };
}
