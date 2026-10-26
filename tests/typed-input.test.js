import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createControls } from '../src/input.ts';

test('typed keyboard controller retains clean lifecycle without duplicate JS implementation', () => {
  const target = new EventTarget();
  const actions = [];
  const controls = createControls(target, action => actions.push(action));
  const key = (type, code) => Object.assign(new Event(type, { cancelable: true }), {
    code, repeat: false,
  });
  target.dispatchEvent(key('keydown', 'KeyW'));
  assert.equal(controls.read().throttle, true);
  target.dispatchEvent(key('keyup', 'KeyW'));
  assert.equal(controls.read().throttle, false);
  target.dispatchEvent(key('keydown', 'KeyP'));
  assert.deepEqual(actions, ['pause']);
  controls.destroy();
  assert.equal(existsSync(new URL('../src/input.js', import.meta.url)), false);
});
