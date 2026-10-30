import test from 'node:test';
import assert from 'node:assert/strict';
import { setupInputModality } from '../src/input-modality.ts';

// A focus ring is for the keyboard: after a tap or click the page says so, and a key press brings it back.
function setup() {
  const root = { dataset: {} }, target = new EventTarget(), writes = [];
  const dataset = new Proxy(root.dataset, { set(object, key, value) { writes.push(value); object[key] = value; return true; } });
  const stop = setupInputModality({ dataset }, target);
  return { root, target, writes, stop };
}

test('the page records whether the last input was a pointer or a key', () => {
  const { root, target } = setup();
  assert.equal(root.dataset.input, undefined, 'nothing is claimed before the first input');
  target.dispatchEvent(new Event('pointerdown'));
  assert.equal(root.dataset.input, 'pointer');
  target.dispatchEvent(new Event('keydown'));
  assert.equal(root.dataset.input, 'keyboard');
  target.dispatchEvent(new Event('touchstart'));
  assert.equal(root.dataset.input, 'pointer');
});

test('the attribute is only written when the input kind changes, and stops when disposed', () => {
  const { root, target, writes, stop } = setup();
  for (let i = 0; i < 5; i++) target.dispatchEvent(new Event('pointerdown'));
  assert.deepEqual(writes, ['pointer'], 'repeated taps write once');
  stop();
  target.dispatchEvent(new Event('keydown'));
  assert.equal(root.dataset.input, 'pointer', 'no listener is left behind');
});
