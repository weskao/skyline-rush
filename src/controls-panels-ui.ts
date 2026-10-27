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
  return { toggleSettings, toggleControls };
}
