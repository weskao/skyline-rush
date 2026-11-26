import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setupRaceNavigation } from '../src/race-navigation-ui.ts';

function navigation(initialPhase, practicing = false) {
  const nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, Object.assign(new EventTarget(), {
      dataset: {}, focus() {}, querySelectorAll: () => [], open: false,
      showModal() { this.open = true; }, close() { this.open = false; },
    }));
    return nodes.get(selector);
  };
  const original = globalThis.document;
  globalThis.document = {
    querySelector: selector => selector === 'dialog[open]' ? (node('#leave-screen').open ? node('#leave-screen') : null) : node(selector),
    getElementById: id => node(`#${id}`),
  };
  let phase = initialPhase, returns = 0;
  setupRaceNavigation({ phase: () => phase, pause: () => { phase = phase === 'paused' ? 'racing' : 'paused'; },
    clearControls() {}, chooseTrack() { returns++; phase = 'ready'; }, isPracticing: () => practicing, requestVehicleReset: () => false });
  return {
    click(selector) { return !node(selector).dispatchEvent(new Event('click', { cancelable: true })); },
    state: () => ({ phase, returns, open: node('#leave-screen').open }),
    cleanup() { if (original === undefined) delete globalThis.document; else globalThis.document = original; },
  };
}

for (const selector of ['.brand', '.intro-wordmark']) test(`${selector} keeps the ready lobby in the same document`, () => {
  const nav = navigation('ready');
  try {
    assert.equal(nav.click(selector), true);
    assert.deepEqual(nav.state(), { phase: 'ready', returns: 0, open: false });
  } finally { nav.cleanup(); }
});

test('finished race brand returns to the lobby without navigating', () => {
  const nav = navigation('finished');
  try {
    assert.equal(nav.click('.brand'), true);
    assert.deepEqual(nav.state(), { phase: 'ready', returns: 1, open: false });
  } finally { nav.cleanup(); }
});

for (const phase of ['racing', 'countdown', 'paused']) for (const practicing of [false, true]) test(`brand confirms ${phase} exit (practice=${practicing}) and Home stays in the document`, () => {
  const nav = navigation(phase, practicing);
  try {
    assert.equal(nav.click('.brand'), true);
    assert.deepEqual(nav.state(), { phase: 'paused', returns: 0, open: true });
    assert.equal(nav.click('#leave-home'), true);
    assert.deepEqual(nav.state(), { phase: 'ready', returns: 1, open: false });
  } finally { nav.cleanup(); }
});
