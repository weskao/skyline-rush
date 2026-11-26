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

test('the lens pass is the final pass: it tone-maps and encodes itself so no second HDR target is written', () => {
  const lens = createLensPass();
  assert.equal(lens.needsSwap, false, 'drawing straight to the screen keeps the scene target as the only full-size MSAA buffer');
  assert.match(lens.fragmentShader ?? lens.material.fragmentShader, /#include <tonemapping_fragment>[\s\S]*#include <colorspace_fragment>/);
  assert.equal(lens.material.toneMapped, true);
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.doesNotMatch(world, /OutputPass/, 'a separate OutputPass would tone-map twice');
  // Warmup must build pipelines for the target the frame really draws into (WebKit keys them on the sample count).
  assert.doesNotMatch(world, /warmupShaders\([^)]*renderTarget1\)/);
  assert.equal(world.match(/warmupShaders\([^)]*composer\.readBuffer\)/g)?.length, 2);
  lens.dispose();
});

test('idle frames draw the single-tap lens; both variants are built on the first frame and after a context restore', () => {
  const lens = createLensPass(), drawn = [], canvas = new EventTarget();
  const renderer = { domElement: canvas, setRenderTarget() {}, render(mesh) { drawn.push(mesh.material.defines.LENS_FX); } };
  const frame = (fx = 0) => {
    drawn.length = 0;
    lens.uniforms.boost.value = fx; lens.uniforms.impact.value = 0; lens.uniforms.pressure.value = 0;
    lens.render(renderer, null, { texture: null }, 0, false);
    return [...drawn];
  };
  lens.renderToScreen = true;
  assert.deepEqual(frame(), [1, 0], 'first frame: the effects variant is built, then the idle one draws the real frame');
  assert.deepEqual(frame(), [0]);
  assert.deepEqual(frame(0.4), [1]);
  lens.uniforms.boost.value = 0;
  for (const key of ['impact', 'pressure']) { lens.uniforms[key].value = 0.2; drawn.length = 0; lens.render(renderer, null, { texture: null }, 0, false); assert.deepEqual(drawn, [1], key); lens.uniforms[key].value = 0; }
  canvas.dispatchEvent(new Event('webglcontextrestored'));
  assert.deepEqual(frame(), [1, 0], 'restored context: rebuild both before the real frame');
  assert.equal(lens.uniforms, lens.material.uniforms, 'both variants share one uniform set');
  lens.dispose();
});
