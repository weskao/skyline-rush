import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupAssistUI } from '../src/assist-ui.ts';

const fakeButton = () => {
  const attrs = {}, listeners = [];
  return { attrs, listeners, title: '', setAttribute: (k, v) => { attrs[k] = v; }, addEventListener: (_, fn) => listeners.push(fn) };
};
const fakeStorage = initial => {
  const data = { ...initial };
  return { data, getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

test('the AUTO assist toggle lives in its own controller, not main.js', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const moved of [/AUTO_KEY/, /function toggleAssist/, /function showAssist/, /let autoThrottle/]) assert.doesNotMatch(main, moved);
});

test('AUTO starts on, remembers only a player toggle, and ignores clicks while locked', () => {
  const saved = globalThis.localStorage;
  try {
    globalThis.localStorage = fakeStorage({});
    const button = fakeButton();
    let locked = false, cues = 0;
    const auto = setupAssistUI({ button, isLocked: () => locked, cue: () => { cues++; } });
    assert.equal(auto.isOn(), true);
    auto.show();
    assert.equal(button.attrs['aria-pressed'], 'true');
    button.listeners[0]();
    assert.equal(auto.isOn(), false);
    assert.equal(button.attrs['aria-pressed'], 'false');
    assert.equal(globalThis.localStorage.data['skyline-rush-auto'], 'off');
    assert.equal(cues, 1);
    locked = true;
    auto.toggle();
    assert.equal(auto.isOn(), false, 'a locked toggle keeps AUTO as it is');
    assert.equal(setupAssistUI({ button: fakeButton(), isLocked: () => false, cue() {} }).isOn(), false, 'a saved "off" is restored');
    delete globalThis.localStorage;
    assert.equal(setupAssistUI({ button: fakeButton(), isLocked: () => false, cue() {} }).isOn(), true, 'no storage keeps AUTO on');
  } finally {
    globalThis.localStorage = saved;
  }
});
