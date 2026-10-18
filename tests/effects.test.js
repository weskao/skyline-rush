import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createRace } from '../src/game.js';
import { createEffects } from '../src/effects.js';

test('a nonpositive first frame cannot revive dormant particles with uninitialized data', t => {
  globalThis.devicePixelRatio = 1;
  t.after(() => { delete globalThis.devicePixelRatio; });
  const scene = new Scene();
  const effects = createEffects(scene, () => 0);
  effects.update(createRace(), -0.005, 0, true, false);
  const particles = scene.children.find(object => object.isPoints);
  assert.ok([...particles.geometry.attributes.alpha.array].every(value => value === 0));
  assert.ok([...particles.geometry.attributes.position.array].every(Number.isFinite));
});
