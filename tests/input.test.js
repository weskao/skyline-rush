import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createControls } from '../src/input.js';
import { DEFAULT_KEY_MAP } from '../src/key-map.js';

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
  assert.deepEqual(controls.read(), { throttle: true, brake: false, steer: -1, fly: true, boost: false, nitro: false });
  assert.ok(space.defaultPrevented);
  send(target, 'blur');
  assert.deepEqual(controls.read(), { throttle: false, brake: false, steer: 0, fly: false, boost: false, nitro: false });
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

function padTarget(controls, settings = { fullLock: 100 }) {
  const el = new EventTarget();
  controls.bindSlidePad(el, { getSettings: () => settings });
  return el;
}

test('slide pad steers analog, reads live fullLock, ignores other pointers, resets on clear', () => {
  const settings = { fullLock: 100 };
  const controls = createControls(new EventTarget());
  const el = padTarget(controls, settings);
  send(el, 'pointerdown', { pointerId: 1, clientX: 200, clientY: 300 });
  send(el, 'pointermove', { pointerId: 1, clientX: 250, clientY: 300 });
  assert.equal(controls.read().steer, 0.5);
  send(el, 'pointermove', { pointerId: 2, clientX: 0, clientY: 300 });
  assert.equal(controls.read().steer, 0.5);
  const second = send(el, 'pointerdown', { pointerId: 2, clientX: 0, clientY: 0 });
  assert.ok(second.defaultPrevented);
  send(el, 'pointermove', { pointerId: 2, clientX: 90, clientY: 0 });
  assert.equal(controls.read().steer, 0.5);
  settings.fullLock = 50;
  send(el, 'pointermove', { pointerId: 1, clientX: 250, clientY: 300 });
  assert.equal(controls.read().steer, 1);
  send(el, 'pointerup', { pointerId: 2 });
  assert.equal(controls.read().steer, 1);
  send(el, 'pointerup', { pointerId: 1 });
  assert.equal(controls.read().steer, 0);
  send(el, 'pointerdown', { pointerId: 3, clientX: 0, clientY: 0 });
  send(el, 'pointermove', { pointerId: 3, clientX: -25, clientY: 0 });
  assert.equal(controls.read().steer, -0.5);
  controls.clear();
  assert.equal(controls.read().steer, 0);
  controls.destroy();
});

test('keyboard and pad steer combine by larger magnitude', () => {
  const target = new EventTarget();
  const controls = createControls(target);
  const el = padTarget(controls);
  send(target, 'keydown', { code: 'ArrowLeft' });
  send(el, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
  send(el, 'pointermove', { pointerId: 1, clientX: 30, clientY: 0 });
  assert.equal(controls.read().steer, -1);
  send(target, 'keyup', { code: 'ArrowLeft' });
  assert.equal(controls.read().steer, 0.3);
  controls.destroy();
});

test('sliding the pad down brakes without disturbing other controls', () => {
  const controls = createControls(new EventTarget());
  const el = padTarget(controls);
  send(el, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
  assert.equal(controls.read().brake, false);
  send(el, 'pointermove', { pointerId: 1, clientX: 0, clientY: 60 });
  assert.equal(controls.read().brake, true);
  send(el, 'pointercancel', { pointerId: 1 });
  assert.equal(controls.read().brake, false);
  controls.destroy();
});

test('toggle fly latches on tap, survives release, clears via setFly/clear; hold mode unchanged', () => {
  const controls = createControls(new EventTarget());
  const fly = new EventTarget();
  controls.bindButton(fly, 'fly');
  send(fly, 'pointerdown', { pointerId: 1 });
  send(fly, 'pointerup', { pointerId: 1 });
  assert.equal(controls.read().fly, false);
  controls.setFlyMode('toggle');
  send(fly, 'pointerdown', { pointerId: 1 });
  send(fly, 'pointerup', { pointerId: 1 });
  assert.equal(controls.read().fly, true);
  send(fly, 'pointerdown', { pointerId: 1 });
  send(fly, 'pointerup', { pointerId: 1 });
  assert.equal(controls.read().fly, false);
  controls.toggleFly();
  assert.equal(controls.read().fly, true);
  controls.setFly(false);
  assert.equal(controls.read().fly, false);
  controls.toggleFly();
  controls.clear();
  assert.equal(controls.read().fly, false);
  controls.destroy();
});

test('alternate keys J/K/L and E drive fly, boost and nitro; originals still work', () => {
  const target = new EventTarget();
  const controls = createControls(target);
  for (const [code, name] of [['KeyJ', 'fly'], ['KeyK', 'boost'], ['KeyL', 'nitro'], ['KeyE', 'nitro'], ['Space', 'fly'], ['ShiftLeft', 'boost']]) {
    send(target, 'keydown', { code });
    assert.equal(controls.read()[name], true, code);
    send(target, 'keyup', { code });
    assert.equal(controls.read()[name], false, code);
  }
  controls.destroy();
});

test('input follows the saved key map as it changes and ignores unbound keys', () => {
  const target = new EventTarget();
  let keyMap = { ...DEFAULT_KEY_MAP, fly: ['KeyF'], boost: ['Space'] };
  const controls = createControls(target, () => {}, { getKeyMap: () => keyMap });
  const space = send(target, 'keydown', { code: 'Space' });
  assert.deepEqual([controls.read().boost, controls.read().fly], [true, false]);
  assert.ok(space.defaultPrevented);
  send(target, 'keyup', { code: 'Space' });
  const j = send(target, 'keydown', { code: 'KeyJ' });
  assert.equal(controls.read().fly, false);
  assert.equal(j.defaultPrevented, false);
  keyMap = DEFAULT_KEY_MAP;
  send(target, 'keydown', { code: 'KeyJ' });
  assert.equal(controls.read().fly, true);
  controls.destroy();
});
