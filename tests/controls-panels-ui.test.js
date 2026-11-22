import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canOpenControlsPanel } from '../src/controls-panels-ui.ts';

test('driving settings are available before the race, when paused and after finishing', () => {
  for (const phase of ['ready', 'paused', 'finished']) assert.equal(canOpenControlsPanel(phase), true, phase);
  for (const phase of ['racing', 'countdown', 'intro']) assert.equal(canOpenControlsPanel(phase), false, phase);
});
