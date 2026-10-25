import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('History dialog is an independent typed Vue panel with all cloud controls and stable selectors', () => {
  const panel = new URL('../src/HistoryPanel.vue', import.meta.url);
  assert.ok(existsSync(panel), 'History must be migrated to a Vue SFC');
  const source = readFileSync(panel, 'utf8');
  assert.match(source, /<script setup lang="ts">/);
  for (const id of [
    'history-screen', 'history-track', 'history-runs', 'mode-history-runs',
    'daily-board', 'cloud-login', 'cloud-logout', 'cloud-sync-now',
    'cloud-import', 'cloud-export', 'cloud-delete', 'achievement-list',
  ]) assert.match(source, new RegExp('id="' + id + '"'), 'preserve selector #' + id);
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  assert.match(app, /<HistoryPanel\s*\/>/);
  assert.doesNotMatch(app, /id="history-screen"/, 'do not mount duplicate dialog');
});
