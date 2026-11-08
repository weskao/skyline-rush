import { test } from 'node:test';
import assert from 'node:assert/strict';

// Dynamic import keeps the first RED an observable missing-module assertion.
let scale = {};
try { scale = await import('../src/landscape-home-scale.ts'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('roomy landscape pages keep the home at full size', () => {
  assert.equal(typeof scale.landscapeHomeScale, 'function', 'short landscape pages need a home scale');
  assert.equal(scale.landscapeHomeScale({ panelHeight: 308, railRoom: 274 }), 1, '844x390');
  assert.equal(scale.landscapeHomeScale({ panelHeight: 236, railRoom: 220 }), 1, 'iPhone Chrome 743x340');
});

test('short in-app browser pages shrink panel and rail together, never below the floor', () => {
  // iPhone Telegram landscape 756x265: panel 84..255, rail room from the tools row (94 + 6) to 255.
  assert.equal(scale.landscapeHomeScale({ panelHeight: 171, railRoom: 155 }), 0.72);
  assert.equal(scale.landscapeHomeScale({ panelHeight: 400, railRoom: 150 }), 0.78, 'the rail can be the tighter side');
  assert.equal(scale.landscapeHomeScale({ panelHeight: 90, railRoom: 80 }), 0.7);
});

test('sub-pixel panel heights give one scale, so zoom rounding cannot make the layout oscillate', () => {
  // 568x320 alternated between 226 and 226.015625 px tall panels, re-zooming every frame.
  assert.equal(scale.landscapeHomeScale({ panelHeight: 226, railRoom: 210 }), 0.95);
  assert.equal(scale.landscapeHomeScale({ panelHeight: 226.015625, railRoom: 210 }), 0.95);
});

test('the scale follows the visible panel and is published as --home-scale', t => {
  const observers = [];
  globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback; observers.push(this); } observe(node) { this.node = node; } };
  t.after(() => { delete globalThis.ResizeObserver; });
  let panel = { top: 84, bottom: 255, height: 171 };
  const intro = { getBoundingClientRect: () => panel };
  const tools = { getBoundingClientRect: () => ({ bottom: 94 }) };
  const writes = [];
  const root = { style: { setProperty: (name, value) => writes.push([name, value]) } };
  scale.trackLandscapeHomeScale(intro, tools, root);
  assert.equal(observers[0].node, intro);
  observers[0].callback();
  assert.deepEqual(writes, [['--home-scale', '0.72']]);
  panel = { top: 0, bottom: 0, height: 0 };
  observers[0].callback();
  assert.equal(writes.length, 1, 'a hidden panel (race running) keeps the last scale');
});
