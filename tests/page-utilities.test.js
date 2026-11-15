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
});

test('Photo Studio restores the scene before it closes through Back, Escape or browser history', t => {
  const classes = new Set();
  const window = new EventTarget();
  const history = {
    state: null,
    pushState(state) { this.state = state; },
    back() { this.state = null; },
  };
  const nodes = new Map(['#photo-screen', '#photo-status', '#photo-open', '.photo-tools', '#photo-advanced',
    '#photo-orbit', '#photo-fov', '#photo-sky', '#photo-close', '#photo-save'].map(id => [id, new EventTarget()]));
  const dialog = nodes.get('#photo-screen');
  const opener = nodes.get('#photo-open');
  const open = () => opener.dispatchEvent(new Event('click'));
  const returnToRace = () => window.dispatchEvent(new Event('popstate'));
  let photoView, sceneAtClose;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => {
    sceneAtClose = { studio: classes.has('photo-studio'), photoView };
    dialog.open = false;
  };
  nodes.get('#photo-orbit').focus = () => {};
  globalThis.window = window;
  globalThis.history = history;
  globalThis.document = {
    body: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } },
    querySelector: id => nodes.get(id),
  };
  t.after(() => {
    delete globalThis.window;
    delete globalThis.history;
    delete globalThis.document;
  });
  setupPhotoUI({
    getRace: () => ({ mode: 'free', phase: 'paused' }),
    getWorld: () => ({ setPhotoView: view => { photoView = view; } }),
    cue: () => {},
  });

  for (const close of [
    () => nodes.get('#photo-close').dispatchEvent(new Event('click')),
    () => {
      const escape = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(escape);
      assert.equal(escape.defaultPrevented, true, 'Escape uses the same close path as Back');
    },
    () => history.back(),
  ]) {
    open();
    assert.equal(dialog.open, true);
    assert.equal(classes.has('photo-studio'), true);
    assert.notEqual(photoView, null);
    close();
    assert.equal(history.state, null);
    returnToRace();
    assert.equal(dialog.open, false);
    assert.deepEqual(sceneAtClose, { studio: false, photoView: null }, 'restore the paused UI and camera before closing');
  }
});
