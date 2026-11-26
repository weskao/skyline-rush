import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderDemand, coversViewport, setupRenderLifecycle, SETTLE_FRAMES } from '../src/render-lifecycle.ts';

const frames = (demand, state, count) => {
  let drawn = 0;
  for (let i = 0; i < count; i++) if (demand.wants(state)) drawn++;
  return drawn;
};
const live = { covered: false, contextLost: false };

test('every animated screen keeps drawing on every paced frame: Home, countdown, racing, results', () => {
  for (const phase of ['ready', 'countdown', 'racing', 'finished']) {
    assert.equal(frames(createRenderDemand(), { ...live, phase }, 1000), 1000, phase);
  }
});

test('a paused race draws until the camera settles, then stops until something changes', () => {
  const demand = createRenderDemand();
  assert.ok(SETTLE_FRAMES >= 60, 'the paused camera lerp needs about 1.5 s to converge');
  assert.equal(frames(demand, { ...live, phase: 'racing' }, 10), 10);
  assert.equal(frames(demand, { ...live, phase: 'paused' }, 1000), SETTLE_FRAMES);
  demand.invalidate(); // pointer, key, settings, photo controls, resize
  assert.equal(frames(demand, { ...live, phase: 'paused' }, 1000), SETTLE_FRAMES);
  assert.equal(frames(demand, { ...live, phase: 'paused', pending: true }, 5), 5, 'a pending scene frame always draws');
  assert.equal(frames(demand, { ...live, phase: 'racing' }, 50), 50, 'resume draws immediately');
});

test('an opaque full-screen cover or a lost context stops drawing; uncovering redraws even when paused', () => {
  const demand = createRenderDemand();
  assert.equal(frames(demand, { ...live, phase: 'racing', covered: true }, 100), 0);
  assert.equal(frames(demand, { ...live, phase: 'ready', contextLost: true }, 100), 0);
  frames(demand, { ...live, phase: 'paused' }, 1000);
  assert.equal(frames(demand, { ...live, phase: 'paused', covered: true }, 10), 0);
  assert.equal(frames(demand, { ...live, phase: 'paused' }, 1000), SETTLE_FRAMES);
});

const VIEW = { innerWidth: 400, innerHeight: 800 };
function fakeDialog({ rect = [0, 0, 400, 800], bg = 'rgb(10, 20, 30)', image = 'none', opacity = '1', backdrop = 'rgba(0, 0, 0, 0.8)', modal = true, hostsCanvas = false } = {}) {
  const [left, top, width, height] = rect;
  const dialog = {
    contains: node => hostsCanvas && node === CANVAS,
    matches: selector => selector === ':modal' && modal,
    getBoundingClientRect: () => ({ left, top, right: left + width, bottom: top + height }),
    style: { backgroundColor: bg, backgroundImage: image, opacity },
    backdrop: { backgroundColor: backdrop, backgroundImage: 'none', opacity: '1' },
  };
  return dialog;
}
const CANVAS = {};
const view = { ...VIEW, getComputedStyle: (el, pseudo) => (pseudo === '::backdrop' ? el.backdrop : el.style) };

test('cover detection: only a fully opaque dialog or backdrop over the whole viewport counts', () => {
  assert.equal(coversViewport(fakeDialog(), CANVAS, view), true, 'opaque full-screen panel');
  assert.equal(coversViewport(fakeDialog({ rect: [20, 100, 360, 400], backdrop: 'rgb(0, 0, 0)' }), CANVAS, view), true, 'opaque modal backdrop');
  assert.equal(coversViewport(fakeDialog({ rect: [20, 100, 360, 400] }), CANVAS, view), false, 'History/Guide: translucent backdrop');
  assert.equal(coversViewport(fakeDialog({ bg: 'rgba(16, 38, 55, 0.93)' }), CANVAS, view), false, 'translucent panel');
  assert.equal(coversViewport(fakeDialog({ bg: 'rgba(0, 0, 0, 0)', image: 'linear-gradient(red, blue)' }), CANVAS, view), false, 'gradient is conservatively not opaque');
  assert.equal(coversViewport(fakeDialog({ opacity: '0.4' }), CANVAS, view), false, 'fading in or out');
  assert.equal(coversViewport(fakeDialog({ hostsCanvas: true }), CANVAS, view), false, 'the Garage hosts the canvas itself');
  assert.equal(coversViewport(fakeDialog({ rect: [0, 0, 400, 600] }), CANVAS, view), false, 'not the whole viewport');
});

function fakeWindow() {
  const listeners = new Map(), observers = [];
  const key = (target, type) => `${target}:${type}`;
  const on = target => ({
    addEventListener(type, fn) { const k = key(target, type); listeners.set(k, [...(listeners.get(k) ?? []), fn]); },
    removeEventListener(type, fn) { const k = key(target, type); listeners.set(k, (listeners.get(k) ?? []).filter(f => f !== fn)); },
  });
  let styleReads = 0, openDialogs = [];
  class Observer { constructor(fn) { this.fn = fn; this.live = true; observers.push(this); } observe() {} disconnect() { this.live = false; } }
  const win = {
    ...VIEW, ...on('window'),
    MutationObserver: Observer, ResizeObserver: Observer,
    getComputedStyle: (el, pseudo) => { styleReads++; return pseudo === '::backdrop' ? el.backdrop : el.style; },
    document: { ...on('document'), body: {}, querySelectorAll: () => openDialogs },
  };
  const canvas = { ...on('canvas') };
  const fire = (target, type, event = {}) => (listeners.get(key(target, type)) ?? []).forEach(fn => fn(event));
  const count = () => [...listeners.values()].reduce((sum, fns) => sum + fns.length, 0);
  return { win, canvas, fire, count, observers, setOpen: list => { openDialogs = list; }, reads: () => styleReads };
}

test('lifecycle: input invalidates, cover is recomputed lazily only on structural changes', () => {
  const env = fakeWindow(), demand = createRenderDemand();
  const lifecycle = setupRenderLifecycle(env.canvas, demand, env.win);
  frames(demand, { ...live, phase: 'paused' }, 1000);
  env.fire('window', 'pointermove');
  assert.equal(frames(demand, { ...live, phase: 'paused' }, 1000), SETTLE_FRAMES);
  assert.equal(lifecycle.covered, false);
  env.setOpen([fakeDialog()]);
  for (let i = 0; i < 100; i++) { env.fire('window', 'pointermove'); void lifecycle.covered; }
  assert.equal(env.reads(), 0, 'pointer input never forces style reads');
  env.observers[0].fn(); // dialog open attribute changed
  assert.equal(lifecycle.covered, true);
  const reads = env.reads();
  for (let i = 0; i < 100; i++) void lifecycle.covered;
  assert.equal(env.reads(), reads, 'cached until the next structural change');
  env.setOpen([]);
  env.fire('window', 'transitionend');
  assert.equal(lifecycle.covered, false);
});

test('lifecycle: one registration per listener and observer, all removed on dispose and on a real pagehide', () => {
  for (const end of ['dispose', 'pagehide']) {
    const env = fakeWindow();
    const lifecycle = setupRenderLifecycle(env.canvas, createRenderDemand(), env.win);
    assert.ok(env.count() > 0);
    assert.equal(env.observers.length, 2);
    if (end === 'dispose') lifecycle.dispose();
    else {
      env.fire('window', 'pagehide', { persisted: true });
      assert.ok(env.count() > 0, 'a bfcache pagehide keeps the lifecycle for pageshow');
      env.fire('window', 'pagehide', { persisted: false });
    }
    assert.equal(env.count(), 0, `${end}: every listener removed`);
    assert.ok(env.observers.every(o => !o.live), `${end}: observers disconnected`);
    lifecycle.dispose(); // idempotent
  }
});

test('lifecycle: bfcache restore, visibility, orientation and WebGL context restore all request a redraw', () => {
  for (const [target, type] of [['window', 'pageshow'], ['document', 'visibilitychange'], ['window', 'orientationchange'], ['window', 'resize'], ['canvas', 'webglcontextrestored']]) {
    const env = fakeWindow(), demand = createRenderDemand();
    setupRenderLifecycle(env.canvas, demand, env.win);
    frames(demand, { ...live, phase: 'paused' }, 1000);
    env.fire(target, type, { persisted: true });
    assert.equal(frames(demand, { ...live, phase: 'paused' }, 1000), SETTLE_FRAMES, `${target}:${type}`);
  }
});
