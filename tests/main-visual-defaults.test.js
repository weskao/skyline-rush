import { test } from 'node:test';
import assert from 'node:assert/strict';
import { garageView } from '../src/garage-view-state.ts';
import { historyView } from '../src/history-view-state.ts';

// Match the visible fallback copy from main/App.vue before controllers update
// asynchronous Vue state. A failed bootstrap must not leave blank controls.
test('Garage starts with main branch finish status and disabled Equip label', () => {
  assert.equal(garageView.selected, 'pearl');
  assert.equal(garageView.status, 'Pearl · standard finish.');
  assert.equal(garageView.equipDisabled, true);
  assert.equal(garageView.equipLabel, 'Standard finish equipped');
});

test('History initial empty-state and medals placeholder match main', () => {
  assert.equal(historyView.historyEmpty, true);
  assert.equal(historyView.achievementStatus, 'Your awarded medals will appear here when available.');
});
