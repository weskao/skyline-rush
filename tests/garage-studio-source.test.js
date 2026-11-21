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
test('Studio offers a wing toggle wired to the camera state and the stage', () => {
  const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
  assert.match(read('GaragePanel.vue'), /id="garage-wing"[^>]*:aria-checked="garageStudioView\.wing"/);
  assert.match(read('garage-ui.ts'), /#garage-wing[\s\S]*toggleGarageWing/);
  assert.match(read('garage-stage.ts'), /state\.wing/);
});

test('Garage exposes one labeled switch for ground and flight poses', () => {
  const vue = readFileSync(new URL('../src/GaragePanel.vue', import.meta.url), 'utf8');
  const actions = vue.match(/<button[^>]*data-garage-mode[^>]*>[\s\S]*?<\/button>/g) ?? [];
  assert.equal(actions.length, 1);
  assert.match(actions[0], /:data-garage-mode="nextPose"/);
  assert.match(actions[0], /role="switch"/);
  assert.match(actions[0], /:aria-checked="garageStudioView.mode === 'flight'"/);
  assert.match(actions[0], /<CollectibleIcon :name="pose" \/>/);
});
