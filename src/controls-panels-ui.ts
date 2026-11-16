import { panelsView, updatePanelsView } from './control-panels-view-state.ts';

export const canOpenControlsPanel = (phase: string): boolean => phase === 'ready' || phase === 'paused';

interface ControlPanelDependencies {
  getRacePhase: () => string;
  clearRebinding: () => void;
  hidePerformanceNotice: () => void;
  trackDropdown: (region: Element, isOpen: boolean, close: () => void) => void;
}

// Audio settings and control layout are event driven, never updated per frame.
export function setupControlPanels({
  getRacePhase, clearRebinding, hidePerformanceNotice, trackDropdown,
}: ControlPanelDependencies) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  function toggleSettings(open: boolean = !panelsView.settingsOpen): void {
    updatePanelsView({ settingsOpen: !!open });
    if (open) syncDestinations();
    if (open) hidePerformanceNotice();
    trackDropdown($('.settings'), open, () => toggleSettings(false));
  }

  // Touch layout is tuned between races only, so the panel never opens mid-race.
  function toggleControls(open: boolean = !panelsView.controlsOpen): void {
    open &&= canOpenControlsPanel(getRacePhase());
    if (!open) clearRebinding();
    updatePanelsView({ controlsOpen: !!open });
    if (open) hidePerformanceNotice();
    trackDropdown($('.controls-menu'), open, () => toggleControls(false));
  }
  const destinations = document.querySelectorAll<HTMLButtonElement>('[data-settings-destination]');
  function syncDestinations(): void {
    for (const button of destinations) {
      const target = document.querySelector<HTMLElement>(button.dataset.settingsDestination!);
      button.disabled = !target?.getClientRects().length ||
        (target.id === 'controls-button' && !canOpenControlsPanel(getRacePhase()));
    }
  }
  for (const button of destinations) button.addEventListener('click', () => {
    const target = document.querySelector<HTMLElement>(button.dataset.settingsDestination!);
    if (!target) return;
    toggleSettings(false);
    target.focus({ preventScroll: true });
    target.click();
  });
  return { toggleSettings, toggleControls };
}
