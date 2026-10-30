import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
test('Garage Studio visually identifies owned, equipped and locked states without a second canvas', () => {
  const vue = src('GaragePanel.vue');
  assert.match(vue, /:data-state="paintState\(id\)"/);
  assert.match(vue, /id="garage-restore-default"/);
  assert.match(vue, /id="garage-preview"/);
  assert.match(vue, /id="garage-auto-rotate"/);
  assert.doesNotMatch(vue, /<canvas/i);
});
test('Garage Studio defines portrait, landscape, safe area and motion fallback', () => {
  const vue = src('GaragePanel.vue');
  assert.match(vue, /@media \(max-width: 650px\) and \(orientation: portrait\)/);
  assert.match(vue, /@media \(max-height: 420px\) and \(orientation: landscape\)/);
  assert.match(vue, /min-height: 44px/);
  assert.match(vue, /prefers-reduced-motion/);
});

test('garage stage publishes render evidence after the actual frame, not per race frame', () => {
  const ui = src('garage-ui.ts');
  assert.match(ui, /inspectGarageStudio\?\.\(\)/);
  assert.match(ui, /inspectRenderLoad\?\.\(\)/);
  assert.match(ui, /preview\.dataset\.carInFrame/);
  assert.match(ui, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
});
