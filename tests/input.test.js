import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createControls } from '../src/input.js';

function send(target, type, properties = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, properties);
  target.dispatchEvent(event);
  return event;
}

test('keyboard maps driving and flight; blur releases every held control', () => {
  const target = new EventTarget();
  const controls = createControls(target);
  send(target, 'keydown', { code: 'KeyW' });
  send(target, 'keydown', { code: 'ArrowLeft' });
  const space = send(target, 'keydown', { code: 'Space' });
  assert.deepEqual(controls.read(), { throttle: true, brake: false, steer: -1, fly: true, boost: false });
  assert.ok(space.defaultPrevented);
  send(target, 'blur');
  assert.deepEqual(controls.read(), { throttle: false, brake: false, steer: 0, fly: false, boost: false });
  controls.destroy();
});

test('opposite steering cancels; keyup and destroy remove input', () => {
  const target = new EventTarget();
  const controls = createControls(target);
  send(target, 'keydown', { code: 'KeyA' });
  send(target, 'keydown', { code: 'KeyD' });
  assert.equal(controls.read().steer, 0);
  send(target, 'keyup', { code: 'KeyA' });
  assert.equal(controls.read().steer, 1);
  controls.destroy();
  send(target, 'keydown', { code: 'KeyW' });
  assert.equal(controls.read().throttle, false);
});

test('pause action fires once on a held key and clears throttle', () => {
  const target = new EventTarget();
  const actions = [];
  const controls = createControls(target, action => actions.push(action));
  send(target, 'keydown', { code: 'KeyW' });
  send(target, 'keydown', { code: 'Escape' });
  send(target, 'keydown', { code: 'Escape', repeat: true });
  assert.deepEqual(actions, ['pause']);
  assert.equal(controls.read().throttle, false);
});

test('camera, audio, airflow and auto accelerator shortcuts preserve held driving inputs', () => {
  const target = new EventTarget();
  const actions = [];
  const controls = createControls(target, action => actions.push(action));
  send(target, 'keydown', { code: 'KeyW' });
  send(target, 'keydown', { code: 'Space' });
  for (const code of ['KeyC', 'KeyM', 'KeyT', 'KeyV']) {
    send(target, 'keydown', { code });
    assert.equal(controls.read().throttle, true);
    assert.equal(controls.read().fly, true);
  }
  send(target, 'keydown', { code: 'KeyV', repeat: true });
  assert.deepEqual(actions, ['camera', 'sound', 'assist', 'airflow']);
  controls.destroy();
});

test('Space on a focused menu button preserves native keyboard activation', () => {
  const button = new EventTarget();
  button.closest = selector => selector === 'button' ? button : null;
  const controls = createControls(button);
  const event = send(button, 'keydown', { code: 'Space' });
  assert.equal(event.defaultPrevented, false);
  assert.equal(controls.read().fly, false);
  controls.destroy();
});

test('touch pointer cancellation releases flight without releasing a separate accelerator', () => {
  const target = new EventTarget();
  const fly = new EventTarget();
  const gas = new EventTarget();
  const controls = createControls(target);
  controls.bindButton(fly, 'fly');
  controls.bindButton(gas, 'throttle');
  send(fly, 'pointerdown', { pointerId: 1 });
  send(gas, 'pointerdown', { pointerId: 2 });
  assert.equal(controls.read().fly, true);
  assert.equal(controls.read().throttle, true);
  send(fly, 'pointercancel', { pointerId: 1 });
  assert.equal(controls.read().fly, false);
  assert.equal(controls.read().throttle, true);
  controls.clear();
  assert.equal(controls.read().throttle, false);
  controls.destroy();
});
