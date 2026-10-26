import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');

test('Vue owns audio and controls menu aria-expanded together with hidden state', () => {
  const cases = [
    ['SettingsPanel.vue', 'settings', 'settingsOpen'],
    ['ControlsPanel.vue', 'controls', 'controlsOpen'],
  ];
  for (const [component, prefix, state] of cases) {
    const template = source(component);
    assert.match(template, new RegExp(`id="${prefix}-button"[^>]*:aria-expanded="panelsView\\.${state}"`));
    assert.match(template, new RegExp(`:hidden="!panelsView\\.${state}"`));
  }
});

test('event-driven panel controller does not duplicate Vue-owned attribute writes', () => {
  const controller = source('controls-panels-ui.ts');
  assert.doesNotMatch(controller, /setAttribute\(['"]aria-expanded['"]/);
  assert.doesNotMatch(controller, /ui\[['"](?:settings|controls)-button['"]\]/);
});
