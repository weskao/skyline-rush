import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('shader warmup has one strict typed implementation without legacy duplication', async () => {
  assert.equal(existsSync(new URL('../src/shader-warmup.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/shader-warmup.js', import.meta.url)), false);
  const { warmupShaders } = await import('../src/shader-warmup.ts');
  const light = { isLight: true, visible: false, frustumCulled: true };
  const hidden = { isLight: false, visible: false, frustumCulled: true };
  const visible = { isLight: false, visible: true, frustumCulled: false };
  const objects = [light, hidden, visible];
  let visited = false;
  const renderer = { setRenderTarget: () => {}, render: () => {
    visited = true;
    assert.equal(light.visible, false);
    assert.equal(hidden.visible, true);
    assert.equal(hidden.frustumCulled, false);
  } };
  assert.equal(warmupShaders(renderer, { traverse: callback => objects.forEach(callback) }, {}, {}), 1);
  assert.equal(visited, true);
  assert.equal(hidden.visible, false);
  assert.equal(hidden.frustumCulled, true);
});
