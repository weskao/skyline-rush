import assert from 'node:assert/strict';
import { test } from 'node:test';

// Minimal DOM for src/startup-screen.ts: one element per id, click listeners kept for the test to fire.
function fakePage(session) {
  const el = () => {
    const listeners = {};
    return {
      hidden: false, inert: false, disabled: false, textContent: '', dataset: {}, style: {}, listeners,
      firstElementChild: { textContent: '' },
      focus() {}, querySelector: id => nodes[id.slice(1)] ?? el(),
      querySelectorAll: () => [],
      addEventListener: (type, fn) => { listeners[type] = fn; },
    };
  };
  const nodes = {};
  for (const id of ['app', 'startup', 'startup-progress', 'startup-fill', 'startup-status', 'startup-error', 'startup-enter', 'startup-retry', 'startup-tagline', 'startup-music']) nodes[id] = el();
  nodes.startup.hidden = false;
  nodes.app.inert = true;
  nodes['startup-enter'].hidden = true;
  nodes['startup-fill'].animate = () => ({ cancel() {}, finished: Promise.resolve() });
  nodes['startup-progress'].animate = nodes['startup-fill'].animate;
  Object.assign(globalThis, {
    document: {
      querySelector: id => nodes[id.slice(1)], documentElement: {},
      body: { dataset: {}, classList: { contains: () => false }, style: { setProperty() {}, removeProperty() {} } },
    },
    window: { addEventListener() {}, innerWidth: 390, innerHeight: 844 },
    sessionStorage: session,
    localStorage: { getItem: key => key === 'skyline-rush-music' ? 'off' : null, setItem() {} },
    getComputedStyle: () => ({
      transform: 'matrix(0.25, 0, 0, 1, 0, 0)',
      getPropertyValue: key => key === '--ease-out' ? 'ease-out' : '240ms',
    }),
    matchMedia: () => ({ matches: true }), // reduced motion: no exit animation to wait for
  });
  return nodes;
}

const memoryStorage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) };
};

let load = 0;
const openPage = session => {
  const nodes = fakePage(session);
  return import(`../src/startup-screen.ts?page=${++load}`).then(({ startup }) => ({ nodes, startup }));
};

test('every new page load covers the lobby with the startup screen, even after this tab entered once', async () => {
  const session = memoryStorage();
  const first = await openPage(session);
  assert.equal(first.nodes.startup.hidden, false);
  first.startup.ready(() => {});
  await first.nodes['startup-enter'].listeners.click();
  assert.equal(first.nodes.startup.hidden, true);
  assert.equal(first.nodes.app.inert, false);

  // Reload, duplicated tab or a link opened in a new tab: sessionStorage carries over.
  const next = await openPage(session);
  assert.equal(next.nodes.startup.hidden, false, 'startup screen must show again');
  assert.equal(next.nodes.app.inert, true, 'half-built lobby must stay covered and inert');
  assert.equal(next.startup.waitingForFrame, true);
});

test('the launch animation keeps the lobby inert and is removed when rendering fails', async () => {
  const { nodes, startup } = await openPage(memoryStorage());
  nodes.startup.dataset.motion = 'high';
  globalThis.matchMedia = () => ({ matches: false });
  let resolveExit;
  const finished = new Promise(resolve => { resolveExit = resolve; });
  nodes.startup.animate = () => ({ finished, cancel: resolveExit });
  await startup.ready(() => assert.fail('a failed render must never enter the lobby'));
  const entry = nodes['startup-enter'].listeners.click();
  assert.equal(nodes.startup.dataset.entering, 'true');
  assert.equal(nodes.app.inert, true);

  startup.fail('renderer');
  await entry;
  assert.equal(nodes.startup.dataset.entering, undefined);
  assert.equal(nodes.startup.dataset.stage, 'failed');
  assert.equal(nodes.app.inert, true);
  assert.equal(nodes['startup-retry'].hidden, false);
});

test('effects-off enters the lobby without creating an animation', async () => {
  const { nodes, startup } = await openPage(memoryStorage());
  nodes.startup.dataset.motion = 'off';
  globalThis.matchMedia = () => ({ matches: false });
  nodes.startup.animate = () => assert.fail('effects-off must enter immediately');
  nodes.app.querySelectorAll = () => assert.fail('effects-off must skip home animations');
  startup.ready(() => {});
  await nodes['startup-enter'].listeners.click();
  assert.equal(nodes.app.inert, false);
});

test('wide home controls start off-screen before the splash fades and play after entry', async () => {
  const { nodes, startup } = await openPage(memoryStorage());
  nodes.startup.dataset.motion = 'high';
  globalThis.matchMedia = () => ({ matches: false });
  window.innerWidth = 1440;
  let finishExit;
  const finished = new Promise(resolve => { finishExit = resolve; });
  nodes.startup.animate = () => ({ finished });
  const slides = new Map();
  nodes.app.querySelectorAll = selectors => selectors.split(', ').map(selector => ({
    offsetWidth: 140,
    getBoundingClientRect: () => ({ left: 40, right: 180, width: 140 }),
    animate: (frames, options) => {
      assert.equal(nodes.startup.hidden, false);
      assert.equal(nodes.app.inert, true);
      const slide = { frames, options, played: false };
      slides.set(selector, slide);
      return { pause() {}, play() {
        assert.equal(nodes.startup.hidden, true);
        assert.equal(nodes.app.inert, false);
        slide.played = true;
      } };
    },
  }));
  await startup.ready(() => {});
  const entry = nodes['startup-enter'].listeners.click();
  assert.ok(parseFloat(slides.get('.lobby-race-heading')?.frames[0].translate) < -180);
  assert.ok(parseFloat(slides.get('#settings-button')?.frames[0].translate) > 1400);
  assert.ok([...slides.values()].every(slide => !slide.played));
  finishExit();
  await entry;
  assert.ok([...slides.values()].every(slide => slide.played));
  assert.equal(slides.get('#start-button')?.frames[1].translate, 'none');
  assert.ok(slides.get('#garage-button').options.delay > slides.get('.lobby-race-heading').options.delay);
  assert.equal(slides.get('#start-button').options.fill, 'backwards');
});

test('startup fills forward from its current position and settles before showing Enter', async () => {
  const { nodes, startup } = await openPage(memoryStorage());
  globalThis.matchMedia = () => ({ matches: false });
  const animations = [];
  let finish;
  nodes['startup-fill'].animate = (frames, { duration }) => {
    animations.push({ frames, duration });
    return { finished: new Promise(resolve => { finish = resolve; }), cancel() {} };
  };
  startup.step(1);
  startup.step(2);
  const ready = startup.ready(() => {});

  assert.equal(animations.length, 3);
  assert.equal(animations[0].frames[0].transform, 'matrix(0.25, 0, 0, 1, 0, 0)');
  assert.notEqual(animations[1].frames[1].transform, 'scaleX(1)');
  assert.equal(animations[2].frames[1].transform, 'scaleX(1)');
  assert.ok(animations[2].duration <= 250);
  assert.equal(nodes['startup-status'].textContent, 'Preparing 3D scene');
  assert.equal(nodes['startup-enter'].hidden, true);
  assert.equal(nodes['startup-progress'].hidden, false);
  let releaseHold;
  const hold = new Promise(resolve => { releaseHold = resolve; });
  nodes['startup-progress'].animate = () => ({ finished: hold, cancel: releaseHold });
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(nodes['startup-status'].textContent, 'Ready to race');
  assert.equal(nodes['startup-enter'].hidden, true);
  assert.equal(nodes['startup-progress'].hidden, false);
  releaseHold();
  await ready;
  assert.equal(nodes['startup-enter'].hidden, false);
  assert.equal(nodes['startup-progress'].hidden, true);
});
