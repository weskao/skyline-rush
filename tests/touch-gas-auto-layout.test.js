import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/touch-sprint-buttons.css', import.meta.url), 'utf8');
const feedback = readFileSync(new URL('../src/sprint-ready-feedback.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const rule = selector => css.split('}').map(block => block.split('{')).find(([head]) => head?.replace(/\s+/g, ' ').trim().endsWith(selector))?.[1];
const AUTO = 'body:not(.layout-editing):has(#assist-button[aria-pressed="true"]) #touch-controls';

test('GAS hides with visibility while AUTO is on, outside layout editing', () => {
  const body = rule(`${AUTO} .touch-pedals > .touch-gas`);
  assert.ok(body, 'AUTO-on rule for GAS');
  assert.match(body, /visibility:\s*hidden/);
  // applyControls reads offsetWidth of a positioned button: display:none would place it wrongly when it returns.
  assert.doesNotMatch(body, /display:\s*none/);
});

test('the tutorial follows AUTO like a race: no tutorial exclusion', () => {
  // Lesson 1 is an AUTO lesson (docs/tutorial-driving.md): with AUTO on its touch copy never names GAS.
  assert.doesNotMatch(css, /data-tutorial/);
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

test('the wide NITRO keeps one centred flame at one button\'s size, never a stretched mask or a twin', () => {
  // Real frames showed two flames with a dip between them, unlike BOOST's single fire (twin removed).
  assert.doesNotMatch(app, /sprint-ready-twin/);
  assert.doesNotMatch(css, /sprint-ready-twin/);
  assert.doesNotMatch(feedback, /querySelectorAll/);
  const body = rule(`${AUTO} .touch-actions > .touch-nitro:not(.is-positioned) > .sprint-ready-effect::before`);
  assert.ok(body, 'wide flame rule');
  assert.match(body, /width:\s*calc\(var\(--cell\)/);
  assert.match(body, /left:\s*50%/);
  assert.match(body, /translate:\s*-50%/);
});
