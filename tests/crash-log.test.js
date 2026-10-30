import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAT_KEY, CRASH_LOG_KEY, installCrashLog, showCrashLog } from '../src/crash-log.ts';

const fakeStorage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; };
const fakeTarget = () => { const listeners = {}; return { addEventListener: (type, fn) => { listeners[type] = fn; }, fire: (type, event) => listeners[type](event) }; };

test('uncaught errors and rejections are stored with the race context, newest eight kept', () => {
  const storage = fakeStorage(), target = fakeTarget();
  installCrashLog(target, storage, () => ({ phase: 'finished', track: 'tokyo', mode: 'classic' }));
  target.fire('error', { message: 'boom', error: { stack: 'Error: boom\n  at frame' } });
  target.fire('unhandledrejection', { reason: new Error('nope') });
  const log = JSON.parse(storage.getItem(CRASH_LOG_KEY));
  assert.equal(log.length, 2);
  assert.deepEqual([log[0].message, log[0].phase, log[0].track, log[0].mode], ['boom', 'finished', 'tokyo', 'classic']);
  assert.match(log[0].stack, /at frame/);
  assert.equal(log[1].message, 'nope');
  for (let i = 0; i < 10; i++) target.fire('error', { message: `e${i}` });
  assert.equal(JSON.parse(storage.getItem(CRASH_LOG_KEY)).length, 8);
});

test('a failing storage never throws out of the error handler', () => {
  const target = fakeTarget();
  installCrashLog(target, { getItem() { throw new Error('quota'); }, setItem() {} }, () => ({ phase: 'racing', track: 'coast', mode: 'classic' }));
  assert.doesNotThrow(() => target.fire('error', { message: 'x' }));
});

test('the stored log shows in the banner; an empty log says so', () => {
  const storage = fakeStorage(), target = fakeTarget();
  installCrashLog(target, storage, () => ({ phase: 'finished', track: 'tokyo', mode: 'classic' }));
  target.fire('error', { message: 'boom', error: { stack: 'Error: boom' } });
  const element = { hidden: true, textContent: '' };
  showCrashLog(element, storage);
  assert.equal(element.hidden, false);
  assert.match(element.textContent, /\[finished tokyo classic\] boom\nError: boom/);
  showCrashLog(element, fakeStorage());
  assert.equal(element.textContent, 'crash log: empty');
});

test('lifecycle events are logged; the live panel counts frames, lists inputs with hit targets and persists a heartbeat', () => {
  const storage = fakeStorage();
  storage.setItem(BEAT_KEY, '07:00:00 frames=9 finished coast classic');
  const listeners = {};
  const doc = { addEventListener: (type, fn) => { listeners[type] = fn; }, visibilityState: 'visible', activeElement: { tagName: 'BODY', className: '' }, elementFromPoint: () => ({ tagName: 'DIV', className: 'race-wipe' }) };
  let rafCallback, tick;
  const win = { addEventListener: (type, fn) => { listeners[type] = fn; }, requestAnimationFrame: fn => { rafCallback = fn; return 1; }, setInterval: fn => { tick = fn; }, document: doc };
  const context = () => ({ phase: 'finished', track: 'tokyo', mode: 'classic' });
  installCrashLog(win, storage, context);
  listeners.pagehide({ persisted: false });
  assert.equal(JSON.parse(storage.getItem(CRASH_LOG_KEY))[0].message, 'pagehide');
  const element = { hidden: true, textContent: '', style: {} };
  showCrashLog(element, storage, { win, context });
  win.requestAnimationFrame(() => {}); rafCallback(16); // the game loop's frame
  listeners.pointerdown({ target: { tagName: 'BUTTON', id: 'next', className: 'primary' }, clientX: 1, clientY: 2, isPrimary: false });
  listeners.touchend({ target: { tagName: 'BUTTON', id: 'next', className: 'primary' }, touches: [{}] });
  tick();
  assert.match(element.textContent, /^[^\n]*pagehide\nbefore reload: 07:00:00 frames=9 finished coast classic\n/);
  assert.match(element.textContent, /pointerdown button#next\.primary hit=div\.race-wipe NOT PRIMARY\n/);
  assert.match(element.textContent, /touchend button#next\.primary touches=1\n/);
  assert.match(element.textContent, /\ndiag \d\d:\d\d:\d\d frames=1 finished tokyo classic vis=visible active=body$/);
  assert.match(storage.getItem(BEAT_KEY), /frames=1 finished tokyo classic$/);
});
