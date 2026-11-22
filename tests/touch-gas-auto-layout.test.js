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

test('the wide NITRO\'s fire follows its width with one-button flames, never a stretched mask or a twin', () => {
  // Real frames: a stretched mask fattens every tongue, and two flames side by side dip in the centre (twin removed).
  assert.doesNotMatch(app, /sprint-ready-twin/);
  assert.doesNotMatch(css, /sprint-ready-twin/);
  // Each copy keeps one button's size; the centre one covers the gap between the flanks.
  const centre = rule(`${AUTO} .touch-actions > .touch-nitro:not(.is-positioned) > .sprint-ready-effect::before`);
  assert.ok(centre, 'wide flame rule');
  assert.match(centre, /width:\s*calc\(var\(--cell\)/);
  assert.match(centre, /left:\s*50%/);
  assert.match(centre, /translate:\s*-50%/);
  // Two flank copies reach the wide button's corners, only on NITRO.
  const nitro = app.match(/<button class="touch-nitro"[\s\S]*?<\/button>/)[0];
  const boost = app.match(/<button class="touch-boost"[\s\S]*?<\/button>/)[0];
  assert.equal(nitro.match(/class="sprint-ready-effect sprint-ready-flank"/g)?.length, 2, 'NITRO carries two flank flames');
  assert.doesNotMatch(boost, /sprint-ready-flank/);
  const flank = side => rule(`${AUTO} .touch-actions > .touch-nitro:not(.is-positioned) > .sprint-ready-flank[data-side="${side}"]::before`);
  assert.match(flank('start') ?? '', /left:\s*0/);
  assert.match(flank('end') ?? '', /right:\s*0/);
  for (const side of ['start', 'end']) {
    assert.match(flank(side) ?? '', /translate:\s*none/, `${side} flank is anchored, not centred`);
    // Same frame in all three copies repeats one fire three times.
    assert.match(flank(side) ?? '', /animation-delay:\s*calc\(var\(--flame-loop, 1\.15s\) \* -/, `${side} flank runs out of phase`);
  }
  // Hidden unless the button is wide; Reduced Motion and forced colours keep every flame off.
  assert.match(rule('#touch-controls [data-flame] > .sprint-ready-flank') ?? '', /display:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) and \(forced-colors: none\) \{\s*body:not[^{]*\[data-flame="on"\] > \.sprint-ready-flank \{ display: block; \}/);
  assert.match(rule('#touch-controls .sprint-ready-flank::after') ?? '', /content:\s*none/, 'one shock ring, on the button outline');
  assert.match(feedback, /querySelectorAll\('\.sprint-ready-effect'\)/, 'the readiness burst plays on every copy');
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
