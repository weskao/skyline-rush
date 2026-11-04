import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPhysicalKey, trackKeyboard, KEYBOARD_SEEN_KEY } from '../src/keyboard-presence.ts';

const fakeWindow = ({ fine = false, stored = null } = {}) => {
  const store = new Map(stored ? [[KEYBOARD_SEEN_KEY, stored]] : []);
  const listeners = [];
  return {
    store,
    matchMedia: query => ({ matches: fine && query === '(hover: hover) and (pointer: fine)' }),
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) },
    addEventListener: (type, fn) => listeners.push(fn),
    removeEventListener: (type, fn) => listeners.splice(listeners.indexOf(fn), 1),
    press: event => [...listeners].forEach(fn => fn({ isComposing: false, target: null, ...event })),
    listeners,
  };
};

test('a physical key has a code; on-screen keyboards send an empty code or compose', () => {
  assert.equal(isPhysicalKey({ code: 'KeyW', isComposing: false, target: null }), true);
  assert.equal(isPhysicalKey({ code: '', isComposing: false, target: null }), false);
  assert.equal(isPhysicalKey({ code: 'KeyA', isComposing: true, target: null }), false);
});

test('typing into a text field never counts as a keyboard (Android IMEs may send codes)', () => {
  assert.equal(isPhysicalKey({ code: 'KeyA', isComposing: false, target: { isContentEditable: false, tagName: 'TEXTAREA' } }), false);
  assert.equal(isPhysicalKey({ code: 'KeyA', isComposing: false, target: { isContentEditable: false, tagName: 'INPUT', type: 'text' } }), false);
  assert.equal(isPhysicalKey({ code: 'Space', isComposing: false, target: { isContentEditable: false, tagName: 'BUTTON' } }), true);
});

test('desktop (hover + fine pointer) shows keyboard settings at once', () => {
  const shown = [];
  const win = fakeWindow({ fine: true });
  trackKeyboard(value => shown.push(value), win);
  assert.deepEqual(shown, [true]);
  assert.equal(win.listeners.length, 0);
});

test('a touch device hides keyboard settings until a physical key is pressed, then remembers it', () => {
  const shown = [];
  const win = fakeWindow();
  trackKeyboard(value => shown.push(value), win);
  assert.deepEqual(shown, [false]);
  win.press({ code: '' });
  assert.deepEqual(shown, [false]);
  win.press({ code: 'KeyW' });
  assert.deepEqual(shown, [false, true]);
  assert.equal(win.store.get(KEYBOARD_SEEN_KEY), '1');
  assert.equal(win.listeners.length, 0);
});

test('a touch device that once used a keyboard shows the settings on the next visit', () => {
  const shown = [];
  trackKeyboard(value => shown.push(value), fakeWindow({ stored: '1' }));
  assert.deepEqual(shown, [true]);
});

test('blocked storage still detects the keyboard for this visit', () => {
  const shown = [];
  const win = fakeWindow();
  win.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  trackKeyboard(value => shown.push(value), win);
  win.press({ code: 'KeyW' });
  assert.deepEqual(shown, [false, true]);
});
