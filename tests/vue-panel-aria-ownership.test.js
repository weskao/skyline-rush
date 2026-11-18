import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');

test('Vue owns settings state and section accessibility while the native dialog owns visibility', () => {
  const panel = source('SettingsPanel.vue');
  const controller = source('controls-panels-ui.ts');
  assert.match(panel, /id="settings-button"[^>]*:aria-expanded="panelsView\.settingsOpen"[^>]*aria-controls="settings-panel"/);
  assert.match(panel, /<dialog id="settings-panel" aria-labelledby="settings-title"/);
  assert.match(panel, /:aria-pressed="panelsView\.section === id"/);
  for (const id of ['driving', 'display', 'audio', 'language']) {
    assert.ok(panel.includes(`id="settings-${id}" :hidden="panelsView.section !== '${id}'"`));
  }
  assert.match(controller, /updatePanelsView\(\{ settingsOpen: true \}\)[\s\S]*dialog\.showModal\(\)/);
  assert.match(controller, /addEventListener\('close',[\s\S]*updatePanelsView\(\{ settingsOpen: false \}\)/);
});

test('event-driven panel controller does not duplicate Vue-owned attribute writes', () => {
  const controller = source('controls-panels-ui.ts');
  assert.doesNotMatch(controller, /setAttribute\(['"]aria-expanded['"]/);
  assert.doesNotMatch(controller, /ui\[['"](?:settings|controls)-button['"]\]/);
});
