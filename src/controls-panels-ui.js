export const canOpenControlsPanel = phase => phase === 'ready' || phase === 'paused';

// Audio settings and control layout are event driven, never updated per frame.
export function setupControlPanels({ ui, getRacePhase, clearRebinding, hidePerformanceNotice, trackDropdown }) {
  const $ = selector => document.querySelector(selector);
  function toggleSettings(open = ui['settings-panel'].hidden) {
    ui['settings-panel'].hidden = !open;
    if (open) hidePerformanceNotice();
    ui['settings-button'].setAttribute('aria-expanded', String(open));
    trackDropdown($('.settings'), open, () => toggleSettings(false));
  }
  
  // Touch layout is tuned between races only, so the panel never opens mid-race.
  function toggleControls(open = ui['controls-panel'].hidden) {
    open &&= canOpenControlsPanel(getRacePhase());
    if (!open) clearRebinding();
    ui['controls-panel'].hidden = !open;
    if (open) hidePerformanceNotice();
    ui['controls-button'].setAttribute('aria-expanded', String(open));
    trackDropdown($('.controls-menu'), open, () => toggleControls(false));
  }
  
  
  return { toggleSettings, toggleControls };
}
