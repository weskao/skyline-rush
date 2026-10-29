import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createControls } from '../src/input.ts';
import { DEFAULT_KEY_MAP } from '../src/key-map.ts';

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
  for (const code of ['KeyC', 'KeyM', 'F2', 'KeyV']) {
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
  button.closest = selector => selector.split(',').map(s => s.trim()).includes('button') ? button : null;
  const controls = createControls(button);
  const event = send(button, 'keydown', { code: 'Space' });
  assert.equal(event.defaultPrevented, false);
  assert.equal(controls.read().fly, false);
  controls.destroy();
});

test('Enter on a focused link or button keeps native activation; elsewhere it still starts the race', () => {
  for (const tag of ['a[href]', 'button']) {
    const actions = [];
    const element = new EventTarget();
    element.closest = selector => selector.split(',').map(part => part.trim()).includes(tag) ? element : null;
    const controls = createControls(element, action => actions.push(action));
    const event = send(element, 'keydown', { code: 'Enter' });
    assert.equal(event.defaultPrevented, false, `${tag}: the browser activates it (the brand link opens the leave prompt)`);
    assert.deepEqual(actions, [], `${tag}: Enter is not also a race action`);
    controls.destroy();
  }
  const actions = [];
  const target = new EventTarget();
  const controls = createControls(target, action => actions.push(action));
  assert.ok(send(target, 'keydown', { code: 'Enter' }).defaultPrevented);
  assert.deepEqual(actions, ['start']);
  controls.destroy();
});

test('Enter and Space on a focused panel summary open it instead of starting the race or flying', () => {
  // A <details> summary (visual settings, Fine tuning, Custom rules) is a native disclosure button.
  const summary = new EventTarget();
  summary.closest = selector => selector.split(',').map(s => s.trim()).includes('summary') ? summary : null;
  const actions = [];
  const controls = createControls(summary, action => actions.push(action));
  for (const code of ['Enter', 'Space']) assert.equal(send(summary, 'keydown', { code }).defaultPrevented, false, code);
  assert.deepEqual(actions, []);
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

test('one touch slides from FLY across the BOOST seam and releases both on cancel', () => {
  const controls = createControls(new EventTarget());
  const fly = new EventTarget(); fly.getBoundingClientRect = () => ({ left: 100, right: 160, top: 0, bottom: 70 });
  const boost = new EventTarget(); boost.getBoundingClientRect = () => ({ left: 40, right: 94, top: 0, bottom: 70 });
  controls.bindButton(fly, 'fly'); controls.bindButton(boost, 'boost');
  send(fly, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 130, clientY: 30 });
  send(fly, 'pointermove', { pointerId: 1, pointerType: 'touch', clientX: 97, clientY: 30 });
  assert.equal(controls.read().fly, true);
  assert.equal(controls.read().boost, true);
  send(fly, 'pointermove', { pointerId: 1, pointerType: 'touch', clientX: 60, clientY: 30 });
  assert.equal(controls.read().fly, false);
  assert.equal(controls.read().boost, true);
  send(fly, 'pointercancel', { pointerId: 1 });
  assert.equal(controls.read().boost, false);
  controls.destroy();
});

// Buttons mode: BRAKE spans the row above [<][>] behind a 14 px gap.
const steeringCluster = controls => {
  const button = (control, rect) => { const el = new EventTarget(); el.getBoundingClientRect = () => rect; controls.bindButton(el, control); return el; };
  return {
    left: button('left', { left: 24, right: 80, top: 100, bottom: 160, width: 56, height: 60 }),
    right: button('right', { left: 86, right: 142, top: 100, bottom: 160, width: 56, height: 60 }),
    brake: button('brake', { left: 24, right: 142, top: 42, bottom: 86, width: 118, height: 44 }),
  };
};

test('one thumb slides from an arrow up into BRAKE to drift: the steer holds, the brake follows the thumb', () => {
  const controls = createControls(new EventTarget());
  const { left } = steeringCluster(controls);
  const move = (clientX, clientY) => send(left, 'pointermove', { pointerId: 1, pointerType: 'touch', clientX, clientY });
  send(left, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 50, clientY: 130 });
  assert.deepEqual([controls.read().steer, controls.read().brake], [-1, false]);
  move(50, 93); // the gap: still only steering
  assert.deepEqual([controls.read().steer, controls.read().brake], [-1, false]);
  move(50, 60);
  assert.deepEqual([controls.read().steer, controls.read().brake], [-1, true]);
  move(120, 60); // drifting across BRAKE above [>] keeps the direction the thumb started with
  assert.deepEqual([controls.read().steer, controls.read().brake], [-1, true]);
  move(50, 130); // back down onto the arrow: the brake lets go, steering continues
  assert.deepEqual([controls.read().steer, controls.read().brake], [-1, false]);
  send(left, 'pointerup', { pointerId: 1 });
  assert.deepEqual([controls.read().steer, controls.read().brake], [0, false]);
  controls.destroy();
});

test('BRAKE bridging needs a steering touch over a visible BRAKE', () => {
  const controls = createControls(new EventTarget());
  const { right, brake } = steeringCluster(controls);
  send(brake, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 50, clientY: 60 });
  send(brake, 'pointermove', { pointerId: 1, pointerType: 'touch', clientX: 50, clientY: 130 });
  assert.deepEqual([controls.read().steer, controls.read().brake], [0, true], 'a thumb that starts on BRAKE stays a plain brake');
  send(brake, 'pointerup', { pointerId: 1 });
  send(right, 'pointerdown', { pointerId: 2, pointerType: 'mouse', clientX: 110, clientY: 130 });
  send(right, 'pointermove', { pointerId: 2, pointerType: 'mouse', clientX: 110, clientY: 60 });
  assert.deepEqual([controls.read().steer, controls.read().brake], [1, false], 'a mouse drag never bridges');
  send(right, 'pointerup', { pointerId: 2 });
  brake.getBoundingClientRect = () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }); // display:none in slide mode
  send(right, 'pointerdown', { pointerId: 3, pointerType: 'touch', clientX: 110, clientY: 130 });
  send(right, 'pointermove', { pointerId: 3, pointerType: 'touch', clientX: 0, clientY: 0 });
  assert.deepEqual([controls.read().steer, controls.read().brake], [1, false], 'a hidden BRAKE is never entered');
  controls.destroy();
});

test('tilt calibrates neutral, ignores invalid samples, handles screen rotation and clears on blur', () => {
  const target = new EventTarget(); target.screen = { orientation: { angle: 0 } };
  const settings = { mode: 'tilt', sensitivity: 1 };
  const controls = createControls(target, () => {}, { getSettings: () => settings });
  controls.setTilt(true);
  send(target, 'deviceorientation', { gamma: 12, beta: 30 });
  assert.equal(controls.read().steer, 0);
  send(target, 'deviceorientation', { gamma: 22, beta: 30 });
  assert.equal(controls.read().steer, 0.5);
  send(target, 'deviceorientation', { gamma: null, beta: null });
  assert.equal(controls.read().steer, 0.5);
  target.screen.orientation.angle = 90;
  send(target, 'deviceorientation', { gamma: 0, beta: 30 });
  assert.equal(controls.read().steer, 0);
  send(target, 'deviceorientation', { gamma: 0, beta: 10 });
  assert.equal(controls.read().steer, -1);
  send(target, 'blur');
  assert.equal(controls.read().steer, 0);
  controls.setTilt(false);
  send(target, 'deviceorientation', { gamma: 0, beta: 50 });
  assert.equal(controls.read().steer, 0);
  controls.destroy();
});

test('slide pad steers analog, reads live fullLock, ignores other pointers\' moves, resets on clear', () => {
  const settings = { fullLock: 100 };
  const controls = createControls(new EventTarget());
  const el = padTarget(controls, settings);
  send(el, 'pointerdown', { pointerId: 1, clientX: 200, clientY: 300 });
  send(el, 'pointermove', { pointerId: 1, clientX: 250, clientY: 300 });
  assert.equal(controls.read().steer, 0.5);
  send(el, 'pointermove', { pointerId: 2, clientX: 0, clientY: 300 });
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

test('Space, Shift and E/X drive fly, boost and nitro; old J/K/L alternates are unbound', () => {
  const target = new EventTarget();
  const controls = createControls(target);
  for (const [code, name] of [['KeyE', 'nitro'], ['KeyX', 'nitro'], ['Space', 'fly'], ['ShiftLeft', 'boost'], ['ShiftRight', 'boost']]) {
    send(target, 'keydown', { code });
    assert.equal(controls.read()[name], true, code);
    send(target, 'keyup', { code });
    assert.equal(controls.read()[name], false, code);
  }
  for (const code of ['KeyJ', 'KeyK', 'KeyL']) assert.equal(send(target, 'keydown', { code }).defaultPrevented, false, code);
  assert.deepEqual([controls.read().fly, controls.read().boost, controls.read().nitro], [false, false, false]);
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
  const shift = send(target, 'keydown', { code: 'ShiftLeft' });
  assert.equal(controls.read().boost, false);
  assert.equal(shift.defaultPrevented, false);
  keyMap = DEFAULT_KEY_MAP;
  send(target, 'keydown', { code: 'ShiftLeft' });
  assert.equal(controls.read().boost, true);
  controls.destroy();
});

test('two keys bound to one action keep it held until both are released', () => {
  const target = new EventTarget();
  const controls = createControls(target);
  send(target, 'keydown', { code: 'ShiftRight' });
  send(target, 'keydown', { code: 'ShiftLeft' });
  send(target, 'keyup', { code: 'ShiftRight' });
  assert.equal(controls.read().boost, true);
  send(target, 'keyup', { code: 'ShiftLeft' });
  assert.equal(controls.read().boost, false);
  controls.destroy();
});

test('a slide-pad drag down and sideways reads as brake plus steer together (the drift input)', () => {
  const controls = createControls(new EventTarget());
  const el = padTarget(controls);
  send(el, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
  send(el, 'pointermove', { pointerId: 1, clientX: 50, clientY: 60 });
  const input = controls.read();
  assert.equal(input.brake, true);
  assert.equal(input.steer, 0.5);
  assert.equal(input.throttle, false);
  controls.destroy();
});

test('keyboard brake plus a steer key reads as brake plus steer together (the drift input)', () => {
  const target = new EventTarget();
  const controls = createControls(target);
  send(target, 'keydown', { code: 'KeyS' });
  send(target, 'keydown', { code: 'KeyD' });
  assert.equal(controls.read().brake, true);
  assert.equal(controls.read().steer, 1);
  controls.destroy();
});

test('desktop steering sensitivity scales keys and buttons without changing slide full lock', () => {
  const target = new EventTarget();
  const settings = { sensitivity: 0.5, fullLock: 60 };
  const controls = createControls(target, () => {}, { getSettings: () => settings });
  send(target, 'keydown', { code: 'KeyD' });
  assert.equal(controls.read().steer, 0.5);
  send(target, 'keyup', { code: 'KeyD' });
  const pad = padTarget(controls, settings);
  send(pad, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
  send(pad, 'pointermove', { pointerId: 1, clientX: 60, clientY: 0 });
  assert.equal(controls.read().steer, 1);
  controls.destroy();
});

test('layout editing blocks touch controls until editing ends', () => {
  const settings = { editing: true };
  const controls = createControls(new EventTarget(), () => {}, { getSettings: () => settings });
  const button = new EventTarget();
  controls.bindButton(button, 'nitro');
  send(button, 'pointerdown', { pointerId: 1 });
  assert.equal(controls.read().nitro, false);
  settings.editing = false;
  send(button, 'pointerdown', { pointerId: 2 });
  assert.equal(controls.read().nitro, true);
  send(button, 'pointerup', { pointerId: 2 });
  assert.equal(controls.read().nitro, false);
  controls.destroy();
});

// WebKit (iPhone Safari/Chrome) withholds pointerup/pointercancel for a touch that began as an edge-swipe
// back/forward gesture, so a pad pointer can be held forever: the next finger down must take the pad over.
test('the newest finger owns the slide pad, so a pointer whose release never arrives cannot pin the steering', () => {
  const controls = createControls(new EventTarget());
  const el = padTarget(controls);
  send(el, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 300 });
  send(el, 'pointermove', { pointerId: 1, clientX: 100, clientY: 300 });
  assert.equal(controls.read().steer, 1);
  const second = send(el, 'pointerdown', { pointerId: 2, clientX: 200, clientY: 300 });
  assert.ok(second.defaultPrevented);
  assert.equal(controls.read().steer, 0);
  send(el, 'pointermove', { pointerId: 1, clientX: 100, clientY: 300 }); // the stale pointer no longer steers
  send(el, 'pointermove', { pointerId: 2, clientX: 150, clientY: 300 });
  assert.equal(controls.read().steer, -0.5);
  send(el, 'pointerup', { pointerId: 1 }); // a late release of the old pointer changes nothing
  assert.equal(controls.read().steer, -0.5);
  send(el, 'pointerup', { pointerId: 2 });
  assert.equal(controls.read().steer, 0);
  controls.destroy();
});

test('a new touch on a touch button releases an older pointer stuck on that same button', () => {
  const controls = createControls(new EventTarget());
  const right = new EventTarget();
  const gas = new EventTarget();
  controls.bindButton(right, 'right');
  controls.bindButton(gas, 'throttle');
  send(right, 'pointerdown', { pointerId: 1 });
  send(gas, 'pointerdown', { pointerId: 2 });
  send(right, 'pointerdown', { pointerId: 3 });
  assert.equal(controls.read().steer, 1);
  send(right, 'pointerup', { pointerId: 3 });
  assert.equal(controls.read().steer, 0);
  assert.equal(controls.read().throttle, true);
  controls.destroy();
});
