import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('scenario 1 — Full-screen entry has distinct Home and Studio and no extra canvas', () => {
  const vue = readFileSync(new URL('../src/GaragePanel.vue', import.meta.url), 'utf8');
  assert.match(vue, /id="garage-studio-open"/);
  assert.match(vue, /:data-page="garageStudioView\.page"/);
  assert.match(vue, /height:\s*100dvh/);
  assert.equal((vue.match(/id="garage-preview"/g) ?? []).length, 1);
});
test('scenario 4 — Navigation offers keyboard controls and clear path back', () => {
  const vue = readFileSync(new URL('../src/GaragePanel.vue', import.meta.url), 'utf8');
  for (const id of ['garage-studio-back','garage-rotate-left','garage-zoom-in','garage-reset']) assert.ok(vue.includes('id="'+id+'"'));
});
