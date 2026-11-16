import { panelsView, updatePanelsView } from './control-panels-view-state.ts';

export const canOpenControlsPanel = (phase: string): boolean => phase === 'ready' || phase === 'paused';

interface ControlPanelDependencies {
  getRacePhase: () => string;
  clearRebinding: () => void;
  clearControls: () => void;
  hidePerformanceNotice: () => void;
}

export function setupControlPanels({
  getRacePhase, clearRebinding, clearControls, hidePerformanceNotice,
}: ControlPanelDependencies) {
  const dialog = document.querySelector<HTMLDialogElement>('#settings-panel')!;
  const gear = document.querySelector<HTMLButtonElement>('#settings-button')!;
  const close = dialog.querySelector<HTMLButtonElement>('#settings-close')!;
  const content = dialog.querySelector<HTMLElement>('.settings-content')!;
  const driving = dialog.querySelector<HTMLButtonElement>('#controls-button')!;
  let opener = gear;

  function toggleSettings(open = !dialog.open, source = gear): void {
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    const phase = getRacePhase();
    driving.disabled = !canOpenControlsPanel(phase);
    if (dialog.open || (driving.disabled && phase !== 'finished') || document.querySelector('dialog[open]')) return;
    if (driving.disabled && panelsView.section === 'driving') updatePanelsView({ section: 'audio' });
    opener = source;
    hidePerformanceNotice();
    clearControls();
    updatePanelsView({ settingsOpen: true });
    dialog.showModal();
    close.focus({ preventScroll: true });
  }
  close.addEventListener('click', () => toggleSettings(false));
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    updatePanelsView({ settingsOpen: false });
    clearRebinding();
    clearControls();
    if (!document.querySelector('dialog[open]') && !document.body.classList.contains('layout-editing')) {
      opener.focus({ preventScroll: true });
    }
  });
  dialog.addEventListener('keydown', event => event.stopPropagation());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)
      toggleSettings(false);
  });
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-settings-section]')) {
    button.addEventListener('click', () => {
      clearRebinding();
      updatePanelsView({ section: button.dataset.settingsSection as typeof panelsView.section });
      content.scrollTop = 0;
    });
  }
  return { toggleSettings };
}
