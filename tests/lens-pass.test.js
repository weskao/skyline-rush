import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Color, Vector2 } from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createLensPass } from '../src/lens-pass.ts';

// Records every full-screen draw as [material, target] without a GL context.
const recordingRenderer = () => {
  let target = null;
  const draws = [];
  return { draws, domElement: new EventTarget(), autoClear: true, getClearColor: c => c ?? new Color(), getClearAlpha: () => 1,
    setClearColor() {}, clear() {}, setRenderTarget(t) { target = t; }, render(mesh) { draws.push([mesh.material, target]); } };
};

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

test('the lens adds the bloom composite at each tap, so the bloom never blends into the 4x MSAA scene target', () => {
  const bloom = new UnrealBloomPass(new Vector2(8, 8), 0.42, 0.55, 1.1), lens = createLensPass(bloom);
  const renderer = recordingRenderer(), scene = { texture: {} };
  bloom.render(renderer, null, scene, 0, false);
  assert.equal(renderer.draws.filter(([, target]) => target === scene).length, 0, 'no bloom draw reloads and resolves the scene target');
  assert.equal(renderer.draws.at(-1)[1], bloom.renderTargetsHorizontal[0], 'the bloom ends at its half-resolution composite');
  assert.ok(renderer.draws.length > 0 && !renderer.draws.some(([material]) => material === bloom.blendMaterial));
  lens.render(renderer, null, scene, 0, false);
  assert.equal(lens.uniforms.tBloom.value, bloom.renderTargetsHorizontal[0].texture, 'the lens samples the composite');
  const shader = lens.material.fragmentShader;
  assert.doesNotMatch(shader.replace(/vec3 src\(vec2 p\)\{[^}]*\}/, ''), /texture2D\(tDiffuse/, 'every scene tap also takes the bloom');
  assert.match(shader, /vec3 src\(vec2 p\)\{ return texture2D\(tDiffuse,p\)\.rgb\+texture2D\(tBloom,p\)\.rgb; \}/);
  bloom.enabled = false; // Low: the composer skips the bloom, and its stale composite must not be added
  lens.render(renderer, null, scene, 0, false);
  assert.notEqual(lens.uniforms.tBloom.value, bloom.renderTargetsHorizontal[0].texture);
  assert.deepEqual([...lens.uniforms.tBloom.value.image.data], [0, 0, 0, 0], 'a bound black texel, never a null sampler');
  lens.dispose(); bloom.dispose();
});

test('the bloom fold refuses a three.js bloom without the blend step it replaces', () => {
  const bloom = new UnrealBloomPass(new Vector2(8, 8), 0.42, 0.55, 1.1);
  delete bloom._fsQuad;
  assert.throws(() => createLensPass(bloom), /UnrealBloomPass changed/);
});

test('world.js hands the bloom to the lens and does not resolve the scene depth nobody reads', () => {
  const world = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(world, /createLensPass\(bloom\)/);
  assert.match(world, /new THREE\.WebGLRenderTarget\(1, 1, \{[^}]*resolveDepthBuffer: false/);
});
