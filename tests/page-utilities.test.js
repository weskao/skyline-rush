import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trackPressedButtons } from '../src/pressed-buttons.ts';
import { setupHistoryDialog } from '../src/history-dialog-ui.ts';
import { setupPhotoUI } from '../src/photo-ui.ts';
import { createPerfOverlay, perfLine } from '../src/perf-overlay.ts';

test('pressed-button feedback, the History dialog, photo mode and the ?perf strip each have a module', () => {
  for (const fn of [trackPressedButtons, setupHistoryDialog, setupPhotoUI, createPerfOverlay]) assert.equal(typeof fn, 'function');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/const pressedButtons/, /function closeHistory/, /\[data-open-history\]/, /const photoDialog/, /#photo-save/, /perfFrames/])
    assert.doesNotMatch(main, moved);
});

test('the ?perf strip reads p50, p95, fps and the sampled seconds', () => {
  assert.equal(perfLine({ p50: 16.66, p95: 18.04, fps: 59.8 }, 12.4), 'FRAME p50 16.7 ms · p95 18.0 ms · 59.8 fps · 12 s');
});

test('a body-level :has() rule styles a class or id, never "everything but": that restyles the whole page', () => {
  // `body:has(#photo-screen[open]) #app > :not(…)` gave Chrome no class to scope its invalidation, so each in-race
  // style recalc touched ~107 elements instead of ~19 (6x-throttled desktop, 1792). Photo Studio marks body instead.
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?=\{)/g).flatMap(s => s.split(',')).map(s => s.trim());
  const subject = s => s.split(/\s*[\s>+~]\s*(?![^(]*\))/).pop();
  // The subject may be body itself, or must name a class/id outside :not()/:has().
  const scoped = s => /^(?:html|body|:root)\b|[.#]/.test(s.replace(/:(?:not|has)\((?:[^()]|\([^()]*\))*\)/g, ''));
  const unscoped = selectors.filter(s => /(?:^|\s)(?:html|body|:root)[^\s]*:has\(/.test(s) && !scoped(subject(s)));
  assert.deepEqual(unscoped, []);
  assert.match(css, /body\.photo-studio #app > :not\(#world\):not\(#photo-screen\)/);
  const photo = readFileSync(new URL('../src/photo-ui.ts', import.meta.url), 'utf8');
  assert.match(photo, /classList\.add\('photo-studio'\)/);
  assert.match(photo, /classList\.remove\('photo-studio'\)/);
  // The page comes back in the same frame the dialog hides, as :has([open]) did: not a task later on 'close'.
  assert.match(photo, /'cancel', leaveStudio/);
  assert.match(photo, /leaveStudio\(\); photoDialog\.close\(\)/);
});
