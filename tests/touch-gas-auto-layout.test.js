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

test('the wide NITRO flame box stays inside the button sideways, so it never widens #touch-controls', () => {
  // NITRO now reaches the cluster's right edge: a sideways reach overflowed #touch-controls by 10px (i18n phone race HUD, 352>342).
  const box = rule(`${AUTO} .touch-actions > .touch-nitro:not(.is-positioned) > .sprint-ready-effect`);
  assert.match(box, /inset:\s*calc\(var\(--flame-top\) \* -100%\) 0 calc\(var\(--flame-bottom\) \* -100%\)/);
  const ring = rule(`${AUTO} .touch-actions > .touch-nitro:not(.is-positioned) > .sprint-ready-effect::after`);
  assert.match(ring, /inset:\s*var\(--button-top\) 0 /, 'the ring hugs the button');
});

test('HUD overlap checks that list GAS skip a visibility:hidden button, as a player sees it', () => {
  // AUTO hides GAS with visibility (layout kept), and the wide NITRO covers its cell: checkVisibility() alone still counts it.
  const files = ['mode-coverage-browser.spec.js', 'helpers/responsive-hud.js', 'helpers/responsive-map.js', 'i18n-browser.spec.js'];
  for (const file of files) {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.match(src, /'throttle'\]\.map/, `${file} lists GAS`);
    for (const call of src.match(/checkVisibility\([^)]*\)/g)) assert.match(call, /visibilityProperty:\s*true/, `${file}: ${call}`);
  }
});
