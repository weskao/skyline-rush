import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canOpenControlsPanel } from '../src/controls-panels-ui.ts';

test('control settings are available only before or during a paused race', () => {
  assert.equal(canOpenControlsPanel('ready'), true);
  assert.equal(canOpenControlsPanel('paused'), true);
  for (const phase of ['racing', 'countdown', 'finished', 'intro']) assert.equal(canOpenControlsPanel(phase), false);
});
