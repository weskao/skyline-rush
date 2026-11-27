import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canOpenControlsPanel, setupControlPanels } from '../src/controls-panels-ui.ts';

test('driving settings are available before the race, when paused and after finishing', () => {
  for (const phase of ['ready', 'paused', 'finished']) assert.equal(canOpenControlsPanel(phase), true, phase);
  for (const phase of ['racing', 'countdown', 'intro']) assert.equal(canOpenControlsPanel(phase), false, phase);
});

// The dialog's close event is a queued task, and a fast second Escape (an input event) can resume the race first: the
// late handler must not focus the gear, or input.ts hands the next Space to it instead of FLY (hud-focus-browser).
test('a settings close that lands after the race resumed leaves focus with the race', () => {
  const focused = [];
  const element = id => ({ id, disabled: false, focus() { focused.push(id); }, addEventListener() {} });
  const listeners = {};
  const dialog = {
    open: false, showModal() { this.open = true; }, close() { this.open = false; },
    addEventListener(type, fn) { listeners[type] = fn; },
    querySelector: selector => element(selector), querySelectorAll: () => [],
  };
  const gear = element('#settings-button');
  const previous = globalThis.document;
  globalThis.document = {
    querySelector: selector => ({ '#settings-panel': dialog, '#settings-button': gear })[selector] ?? null,
    body: { classList: { contains: () => false } },
  };
  try {
    let phase = 'paused', clears = 0;
    const noop = () => {};
    const { toggleSettings } = setupControlPanels({ getRacePhase: () => phase, clearRebinding: noop,
      clearControls: () => clears++, hidePerformanceNotice: noop, restorePerformanceNotice: noop });
    toggleSettings(true);
    toggleSettings(false);
    phase = 'racing'; // the second Escape resumed (and cleared the controls) before the queued close event ran
    const before = clears;
    listeners.close();
    assert.deepEqual(focused.filter(id => id === '#settings-button'), []);
    assert.equal(clears, before, 'a Space pressed since the resume stays held');
    phase = 'paused';
    toggleSettings(true);
    toggleSettings(false);
    listeners.close();
    assert.equal(focused.at(-1), '#settings-button', 'closing while still paused returns focus to the gear');
  } finally {
    globalThis.document = previous;
  }
});
