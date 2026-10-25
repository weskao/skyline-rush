import { test } from 'node:test';
import assert from 'node:assert/strict';
import { panelsView, updatePanelsView } from '../src/control-panels-view-state.js';

test('settings and controls dropdowns preserve independent reactive visibility', () => {
  updatePanelsView({ settingsOpen: true, controlsOpen: false });
  assert.equal(panelsView.settingsOpen, true);
  assert.equal(panelsView.controlsOpen, false);
  updatePanelsView({ settingsOpen: false });
  assert.equal(panelsView.settingsOpen, false);
  assert.equal(panelsView.controlsOpen, false);
});
