import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trackPressedButtons } from '../src/pressed-buttons.ts';
import { setupHistoryDialog } from '../src/history-dialog-ui.ts';
import { setupPhotoUI } from '../src/photo-ui.ts';
import { createPerfOverlay, perfLine } from '../src/perf-overlay.ts';

test('pressed-button feedback, the History dialog, photo mode and the ?perf strip each have a module', () => {
  for (const fn of [trackPressedButtons, setupHistoryDialog, setupPhotoUI, createPerfOverlay]) assert.equal(typeof fn, 'function');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/const pressedButtons/, /function closeHistory/, /\[data-open-history\]/, /const photoDialog/, /#photo-save/, /perfFrames/])
    assert.doesNotMatch(main, moved);
});

test('the ?perf strip reads p50, p95, fps and the sampled seconds', () => {
  assert.equal(perfLine({ p50: 16.66, p95: 18.04, fps: 59.8 }, 12.4), 'FRAME p50 16.7 ms · p95 18.0 ms · 59.8 fps · 12 s');
});
