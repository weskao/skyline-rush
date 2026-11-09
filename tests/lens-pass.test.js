import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLensPass } from '../src/lens-pass.ts';

test('the lens/grade post pass lives in its own module with the uniforms world.js drives', () => {
  const lens = createLensPass();
  for (const name of ['tDiffuse', 'gain', 'boost', 'impact', 'pressure', 'nozzle', 'time']) assert.ok(name in lens.uniforms, name);
  assert.equal(lens.uniforms.gain.value, 1);
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /uniform sampler2D tDiffuse; uniform float gain/, 'world.js no longer embeds the lens shader');
  lens.dispose();
});
