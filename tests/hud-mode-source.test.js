import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HUD_SETTINGS_COPY } from '../src/locales/hud-settings.ts';
import { strayEnglish } from './helpers/i18n-english.js';
const read = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const view = read('HudSettings.vue');

// The speaker button is the audio menu; HUD layout is a display setting, so it lives in the VFX panel.
test('Race HUD options live in the VFX panel, not in the audio dropdown', () => {
  const audio = read('SettingsPanel.vue');
  assert.doesNotMatch(audio, /hud-mode|hudSettings\.|HudFeedback|HudWidgets/);
  assert.match(audio, /tr\('audio\.settings'\)/);
  const vfx = read('App.vue').match(/<div class="vfx-settings">[\s\S]*?id="vfx-reset"/)[0];
  assert.match(vfx, /<HudSettings \/>/);
  assert.equal(HUD_SETTINGS_COPY.en['hudSettings.panel'], undefined, 'no "Audio and HUD" label is left behind');
});

test('HUD selector is a real Settings radio input with localized Hybrid/Competitive options and reset', () => {
  assert.match(view, /name="hud-mode"/);
  assert.match(view, /@change="chooseHudMode\(/);
  assert.match(view, /readHudMode\(/);
  assert.match(view, /onMounted\(/);
  assert.match(view, /onLocaleChange\(/);
  assert.match(HUD_SETTINGS_COPY['zh-TW']['hudSettings.hybrid'], /沉浸式/);
  assert.match(HUD_SETTINGS_COPY['zh-TW']['hudSettings.competitive'], /競技資訊/);
});

test('HUD settings copy lives in the locale catalog, never in a per-component language branch', () => {
  assert.doesNotMatch(view, /isChinese/);
  assert.doesNotMatch(view, /[\u3400-\u9fff]/, 'HudSettings.vue must read zh-TW text from src/locales/hud-settings.ts');
  assert.deepEqual(Object.keys(HUD_SETTINGS_COPY['zh-TW']).sort(), Object.keys(HUD_SETTINGS_COPY.en).sort());
  for (const [key, text] of Object.entries(HUD_SETTINGS_COPY['zh-TW'])) assert.deepEqual(strayEnglish(text), [], key);
});
test('HUD mode labels never expose internal design codes (A+B / C) to players', () => {
  for (const locale of Object.values(HUD_SETTINGS_COPY)) {
    for (const key of ['hudSettings.hybrid', 'hudSettings.competitive']) assert.doesNotMatch(locale[key], /\(.*\b(A\+B|C)\b.*\)|\(C\)/, key);
  }
});
test('Hybrid and Competitive keep essential progress and yield the center to gameplay', () => {
  assert.match(view, /body\[data-hud-mode="hybrid"\] #leaderboard/);
  assert.match(view, /@media \(max-width: 760px\)/);
  assert.doesNotMatch(view, /#race-progress\s*\{\s*display:\s*none/);
});

test('Settings exposes independent READY sound and animation toggles and a true reset for all HUD options', () => {
  assert.match(view, /readHudFeedback\(/);
  assert.match(view, /writeHudFeedback\(/);
  assert.match(view, /resetHudPreferences\(/);
  assert.match(view, /type="checkbox"[^>]*:checked="feedback\.sound"/);
  assert.match(view, /type="checkbox"[^>]*:checked="feedback\.animation"/);
});
