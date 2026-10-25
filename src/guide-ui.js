import { t } from './i18n.js';
import { updateGuideView } from './guide-view-state.ts';

export const guidePracticeLabelKey = completed => completed ? 'tutorial.retry' : 'tutorial.start';
export const guideDeviceForPointer = touch => touch ? 'mobile' : 'desktop';

// Modal events are initialized once after Vue renders its static shell.
// Only UI state lives here: tutorial and input lifecycle stay in main.
export function setupGuideUI({ beforeOpen, touchMatches, renderKeyMap, isTutorialActive, clearControls }) {
  const $ = selector => document.querySelector(selector);
  const guideScreen = $('#guide-screen');
  guideScreen.addEventListener('keydown', event => {
    // Keep driving shortcuts inside the modal; input.js otherwise consumes Escape.
    event.stopPropagation();
    if (event.code === 'Escape') { event.preventDefault(); closeGuide(); }
  });
  let guideOpener;
  function selectGuideDevice(device) { updateGuideView({ selectedDevice: device }); }
  function openGuide(opener) {
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
  for (const button of document.querySelectorAll('[data-guide-device]')) button.addEventListener('click', () => selectGuideDevice(button.dataset.guideDevice));
  $('#guide-open').addEventListener('click', () => openGuide($('#controls-button')));
  // The home Practice entry lands on the practice call to action; the illustrations stay one scroll above it.
  $('#practice-button').addEventListener('click', ({ currentTarget }) => {
    openGuide(currentTarget);
    $('#guide-practice').focus();
  });
  let guideSeen = false;
  try { guideSeen = localStorage.getItem('skyline-rush-guide-seen') === '1'; } catch { /* Offer practice once per page when storage is unavailable. */ }
  function closeGuide() {
    guideSeen = true;
    try { localStorage.setItem('skyline-rush-guide-seen', '1'); } catch { /* Closing stays usable when storage is blocked. */ }
    guideScreen.close();
  }
  $('#guide-close').addEventListener('click', closeGuide);
  guideScreen.addEventListener('cancel', event => { event.preventDefault(); closeGuide(); });
  guideScreen.addEventListener('close', () => {
    if (isTutorialActive()) return;
    clearControls(); guideOpener?.focus({ preventScroll: true });
  });
  
  
  return { openGuide, closeGuide, hasSeenGuide: () => guideSeen };
}
