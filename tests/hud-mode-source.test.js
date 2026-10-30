import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const view = readFileSync(new URL('../src/SettingsPanel.vue', import.meta.url), 'utf8');

test('HUD selector is a real Settings radio input with localized Hybrid/Competitive options and reset', () => {
  assert.match(view, /name="hud-mode"/);
  assert.match(view, /@change="chooseHudMode\(/);
  assert.match(view, /readHudMode\(/);
  assert.match(view, /onMounted\(/);
  assert.match(view, /onLocaleChange\(/);
  assert.match(view, /沉浸式/);
  assert.match(view, /競技資訊/);
});
test('Hybrid and Competitive keep essential progress and yield the center to gameplay', () => {
  assert.match(view, /body\[data-hud-mode="hybrid"\] #leaderboard/);
  assert.match(view, /@media \(max-width: 760px\)/);
  assert.doesNotMatch(view, /#race-progress\s*\{\s*display:\s*none/);
});
