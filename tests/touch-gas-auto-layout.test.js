import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/touch-sprint-buttons.css', import.meta.url), 'utf8');
const feedback = readFileSync(new URL('../src/sprint-ready-feedback.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const rule = selector => css.split('}').map(block => block.split('{')).find(([head]) => head?.replace(/\s+/g, ' ').trim().endsWith(selector))?.[1];
const AUTO = 'body:not([data-tutorial="active"], .layout-editing):has(#assist-button[aria-pressed="true"]) #touch-controls';

test('GAS hides with visibility while AUTO is on, outside the tutorial and layout editing', () => {
  const body = rule(`${AUTO} .touch-pedals > .touch-gas`);
  assert.ok(body, 'AUTO-on rule for GAS');
  assert.match(body, /visibility:\s*hidden/);
  // applyControls reads offsetWidth of a positioned button: display:none would place it wrongly when it returns.
  assert.doesNotMatch(body, /display:\s*none/);
});

test('the tutorial exclusion is named as a removable shortcut', () => {
  assert.match(css, /shortcut:[^\n*]*tutorial[^\n*]*feature\/tutorial-auto-lesson/i);
});

test('NITRO spans both columns of the top row unless a player placed it', () => {
  const body = rule(`${AUTO} .touch-actions > .touch-nitro:not(.is-positioned)`);
  assert.ok(body, 'AUTO-on rule for NITRO');
  assert.match(body, /grid-column:\s*2\s*\/\s*4/);
  assert.match(body, /width:\s*auto/);
  assert.doesNotMatch(body, /grid-row/, 'NITRO stays on the top row');
});

test('BOOST and FLY are not restyled by AUTO', () => {
  assert.doesNotMatch(css, /assist-button[^{]*\.touch-(boost|fly)\b[^{]*\{/);
});

test('the wide NITRO flame is built from two normal-sized flames, never one stretched mask', () => {
  assert.match(app, /sprint-ready-twin/);
  assert.match(feedback, /querySelectorAll\('\.sprint-ready-effect'\)/);
  const body = rule(`${AUTO} .touch-actions > .touch-nitro:not(.is-positioned) > .sprint-ready-effect::before`);
  assert.ok(body, 'wide flame rule');
  assert.match(body, /width:\s*calc\(var\(--cell\)/);
});
