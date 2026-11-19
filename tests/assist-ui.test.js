import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupAssistUI } from '../src/assist-ui.ts';

const fakeButton = () => {
  const attrs = {}, listeners = {};
  return { attrs, title: '', setAttribute: (k, v) => { attrs[k] = v; }, addEventListener: (type, fn) => { listeners[type] = fn; }, click: () => listeners.click() };
};

test('AUTO lives in its own controller, not in main.js', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /AUTO_KEY|function toggleAssist/);
});

test('AUTO toggles, saves the player choice and stays locked during the tutorial', () => {
  const store = new Map([['skyline-rush-auto', 'off']]);
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  let locked = false, cues = 0;
  const button = fakeButton();
  const assist = setupAssistUI({ button, isLocked: () => locked, cueUi: () => cues++ });
  assert.equal(assist.isOn(), false);
  assert.equal(button.attrs['aria-pressed'], 'false');
  button.click();
  assert.equal(assist.isOn(), true);
  assert.equal(store.get('skyline-rush-auto'), 'on');
  assert.equal(cues, 1);
  locked = true;
  assist.toggleAssist();
  assert.equal(assist.isOn(), true);
  delete globalThis.localStorage;
});
