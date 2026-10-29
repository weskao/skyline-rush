import { test } from 'node:test';
import assert from 'node:assert/strict';

// Dynamic import keeps the first RED an observable missing-module assertion.
let offset = {};
try { offset = await import('../src/hud-progress-offset.ts'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('mode HUD rows growing the progress block publish its bottom edge for blocks pinned below it', t => {
  assert.equal(typeof offset.trackProgressBottom, 'function', 'phones need the progress block bottom to place the map below it');
  const observers = [];
  globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback; observers.push(this); } observe(node) { this.node = node; } };
  t.after(() => { delete globalThis.ResizeObserver; });
  let bottom = 262.2;
  const progress = { getBoundingClientRect: () => ({ bottom }) };
  const writes = [];
  const root = { style: { setProperty: (name, value) => writes.push([name, value]) } };
  offset.trackProgressBottom(progress, root);
  assert.equal(observers.length, 1);
  assert.equal(observers[0].node, progress);
  assert.deepEqual(writes, [], 'nothing is measured until the block is laid out');
  observers[0].callback();
  bottom = 318.6; // a checkpoint/item row appeared
  observers[0].callback();
  assert.deepEqual(writes, [['--race-progress-bottom', '263px'], ['--race-progress-bottom', '319px']]);
});

test('without ResizeObserver the pinned blocks keep their fixed positions', () => {
  assert.doesNotThrow(() => offset.trackProgressBottom({ getBoundingClientRect: () => ({ bottom: 0 }) }, { style: { setProperty() { throw new Error('no writes'); } } }));
});
