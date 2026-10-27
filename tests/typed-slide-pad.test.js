import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createSlidePad } from '../src/slide-pad.ts';

test('typed slide pad preserves steering dead-zone, brake and full-lock recovery', () => {
  const pad = createSlidePad();
  pad.down(100, 200);
  pad.move(105, 239);
  assert.deepEqual([pad.read().steer, pad.read().brake], [0, false]);
  pad.move(100, 240);
  assert.deepEqual([pad.read().steer, pad.read().brake], [0, true]);
  pad.move(300, 240);
  assert.equal(pad.read().steer, 1);
  pad.move(270, 240);
  assert.equal(pad.read().steer, .5);
  pad.up();
  assert.equal(pad.read().active, false);
  assert.equal(existsSync(new URL('../src/slide-pad.js', import.meta.url)), false);
});
