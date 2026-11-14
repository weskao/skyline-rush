import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSprintReadyFeedback } from '../src/sprint-ready-feedback.ts';

function fixture(t, preferences) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = { reads: 0, getItem() { storage.reads += 1; return JSON.stringify(preferences); } };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  t.after(() => previous ? Object.defineProperty(globalThis, 'localStorage', previous) : delete globalThis.localStorage);
  const events = [];
  const button = name => ({ dataset: {}, querySelector: () => ({ animate: (_keyframes, { pseudoElement }) => {
    events.push(`${name}${pseudoElement}`);
    return { cancel: () => events.push(`${name}${pseudoElement}:cancel`) };
  } }) });
  const nitro = button('nitro'), boost = button('boost');
  const feedback = createSprintReadyFeedback(nitro, boost, (...args) => events.push(args));
  const car = { nitro: .8, fuel: 0, boosting: false, braking: false };
  return { nitro, boost, feedback, car, events, storage };
}

test('simultaneous availability cues are staggered and remain one-shot', t => {
  const { nitro, boost, feedback, car, events } = fixture(t, { sound: true, animation: true });
  feedback.update('racing', car, false, false, true);
  Object.assign(car, { nitro: 1, fuel: 10 });
  feedback.update('racing', car, false, false, true);
  feedback.update('racing', car, false, false, true);
  assert.equal(nitro.dataset.nitroState, 'ready');
  assert.equal(boost.dataset.boostState, 'ready');
  // Each button bursts its flame (::before) and fires one shock ring (::after).
  assert.deepEqual(events, [['nitro-ready'], ['boost-ready', .33], 'nitro::before', 'nitro::after', 'boost::before', 'boost::after']);
  feedback.update('racing', car, false, false, false);
  assert.deepEqual(events.slice(6), ['nitro::before:cancel', 'nitro::after:cancel', 'boost::before:cancel', 'boost::after:cancel']);
});

test('HUD preferences suppress cues without masking the ready state', t => {
  const { nitro, boost, feedback, car, events } = fixture(t, { sound: false, animation: false });
  feedback.update('racing', { ...car, fuel: 100 }, false, false, true);
  assert.equal(boost.dataset.boostState, 'ready');
  assert.deepEqual(events, []);
  assert.equal(nitro.dataset.flame, 'off');
  assert.equal(boost.dataset.flame, 'off');
});

test('the sustained flame follows motion and the race phase without reading storage per frame', t => {
  const { nitro, boost, feedback, car, storage } = fixture(t, { sound: true, animation: true });
  feedback.update('racing', car, false, false, true);
  assert.equal(nitro.dataset.flame, 'on');
  assert.equal(boost.dataset.flame, 'on');
  const reads = storage.reads;
  for (let frame = 0; frame < 5; frame += 1) feedback.update('racing', car, false, false, true);
  assert.equal(storage.reads, reads);
  feedback.update('racing', car, false, false, false);
  assert.equal(nitro.dataset.flame, 'off');
  feedback.update('racing', car, false, false, true);
  assert.equal(boost.dataset.flame, 'on');
  feedback.update('paused', car, false, false, true);
  assert.equal(boost.dataset.flame, 'off');
  feedback.reset();
  feedback.update('racing', car, false, false, true);
  assert.equal(nitro.dataset.flame, 'on');
});
