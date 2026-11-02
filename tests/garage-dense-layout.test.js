import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/GaragePanel.vue', import.meta.url), 'utf8');
const markup = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? '';

test('Garage Home consumes the full safe viewport without a capped content width', () => {
  const header = markup.match(/<header class="garage-heading">([\s\S]*?)<\/header>/)?.[1] ?? '';
  assert.match(header, /id="garage-studio-open"/, 'put Studio entry in the header, not in its own full-width row');
  assert.doesNotMatch(source, /max-width:\s*1150px/, 'do not waste desktop width with a hard-coded cap');
  assert.match(source, /\[data-page="home"\] \.garage-layout \{[^}]*margin:\s*0/s);
});

test('Studio gives the car the freed-up room but preserves accessible controls', () => {
  const preview = markup.match(/<div id="garage-preview"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.match(preview, /garage-hint/, 'move the camera hint inside the preview, not another layout row');
  assert.match(source, /\.garage-camera-controls \{[^}]*flex-wrap:\s*nowrap;[^}]*overflow-x:\s*auto/s,
    'camera controls must use one scrollable row on narrow phones');
  assert.match(markup, /data-garage-mode="flight"/);
  assert.match(markup, /data-garage-mode="ground"/);
  for (const id of ['garage-reset', 'garage-zoom-in', 'garage-zoom-out', 'garage-rotate-left', 'garage-rotate-right'])
    assert.ok(markup.includes('id="' + id + '"'), id + ' must remain available');
});
