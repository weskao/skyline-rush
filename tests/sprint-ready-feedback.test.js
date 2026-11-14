import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSprintReadyFeedback } from '../src/sprint-ready-feedback.ts';

function fixture(t, preferences) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify(preferences) } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'localStorage', previous) : delete globalThis.localStorage);
  const events = [];
  const button = name => ({ dataset: {}, querySelector: () => ({ animate: () => {
    events.push(name);
    return { cancel: () => events.push(`${name}:cancel`) };
  } }) });
  const nitro = button('nitro:flash'), boost = button('boost:flash');
  const feedback = createSprintReadyFeedback(nitro, boost, (...args) => events.push(args));
  const car = { nitro: .8, fuel: 0, boosting: false, braking: false };
  return { nitro, boost, feedback, car, events };
}

test('simultaneous availability cues are staggered and remain one-shot', t => {
  const { nitro, boost, feedback, car, events } = fixture(t, { sound: true, animation: true });
  feedback.update('racing', car, false, false, true);
  Object.assign(car, { nitro: 1, fuel: 10 });
  feedback.update('racing', car, false, false, true);
  feedback.update('racing', car, false, false, true);
  assert.equal(nitro.dataset.nitroState, 'ready');
  assert.equal(boost.dataset.boostState, 'ready');
  assert.deepEqual(events, [['nitro-ready'], ['boost-ready', .33], 'nitro:flash', 'boost:flash']);
  feedback.update('racing', car, false, false, false);
  assert.deepEqual(events.slice(4), ['nitro:flash:cancel', 'boost:flash:cancel']);
});

test('HUD preferences suppress cues without masking the ready state', t => {
  const { boost, feedback, car, events } = fixture(t, { sound: false, animation: false });
  feedback.update('racing', { ...car, fuel: 100 }, false, false, true);
  assert.equal(boost.dataset.boostState, 'ready');
  assert.deepEqual(events, []);
});
