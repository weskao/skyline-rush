import assert from 'node:assert/strict';
import { test } from 'node:test';

// Minimal DOM for src/startup-screen.ts: one element per id, click listeners kept for the test to fire.
function fakePage(session) {
  const el = () => {
    const listeners = {};
    return {
      hidden: false, inert: false, disabled: false, textContent: '', dataset: {}, listeners,
      firstElementChild: { textContent: '' },
      focus() {}, querySelector: id => nodes[id.slice(1)] ?? el(),
      addEventListener: (type, fn) => { listeners[type] = fn; },
    };
  };
  const nodes = {};
  for (const id of ['app', 'startup', 'startup-progress', 'startup-status', 'startup-error', 'startup-enter', 'startup-retry', 'startup-tagline', 'startup-music']) nodes[id] = el();
  nodes.startup.hidden = false;
  nodes.app.inert = true;
  Object.assign(globalThis, {
    document: {
      querySelector: id => nodes[id.slice(1)], documentElement: {},
      body: { dataset: {}, classList: { contains: () => false }, style: { setProperty() {}, removeProperty() {} } },
    },
    window: { addEventListener() {}, innerWidth: 390, innerHeight: 844 },
    sessionStorage: session,
    localStorage: { getItem: key => key === 'skyline-rush-music' ? 'off' : null, setItem() {} },
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
  startup.ready(() => assert.fail('a failed render must never enter the lobby'));
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
  startup.ready(() => {});
  await nodes['startup-enter'].listeners.click();
  assert.equal(nodes.app.inert, false);
});
