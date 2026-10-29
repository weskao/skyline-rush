import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// <body data-race-mode> mirrors the selected mode, and 10A remembers that mode across reloads, so a bare
// [data-race-mode="x"] locator also matches <body> whenever x is the current mode: Playwright's strict
// mode then refuses the click (item-rules-browser failed this way at the gate). Target the mode button.
test('browser specs locate mode tabs by their button, never a bare [data-race-mode] that also matches <body>', () => {
  const dir = new URL('.', import.meta.url);
  const bare = readdirSync(dir).filter(name => name.endsWith('.spec.js')).flatMap(name =>
    readFileSync(new URL(name, dir), 'utf8').split('\n').flatMap((line, i) =>
      /locator\(\s*['"`]\[data-race-mode=/.test(line) ? [`${name}:${i + 1}`] : []));
  assert.deepEqual(bare, []);
});
