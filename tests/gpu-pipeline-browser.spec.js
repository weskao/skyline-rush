import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// docs/performance/gpu-pipeline.md: the lens pass tone-maps and encodes straight to the screen. These checks hold the
// merged chain to the old Lens -> MSAA HalfFloat target -> OutputPass chain on the same frozen frame.
const SETS = {
  idle: { boost: 0, impact: 0, pressure: 0, gain: 1, saturation: 1, contrast: 1, tint: [1, 1, 1] },
  effects: { boost: 1, impact: 1, pressure: 0.6, gain: 1.4, saturation: 0.8, contrast: 1.1, tint: [1, 0.95, 0.9], nozzle: [0.5, 0.42], time: 1.3 },
};

const compare = (page, set) => page.evaluate(async set => {
  const { composer, renderer } = window.gameScene, gl = renderer.getContext(), passes = [...composer.passes];
  const lens = passes.find(pass => pass.uniforms?.saturation);
  const { OutputPass } = await import('/node_modules/three/examples/jsm/postprocessing/OutputPass.js');
  for (const [key, value] of Object.entries(set)) {
    const uniform = lens.uniforms[key].value;
    if (Array.isArray(value)) uniform.fromArray(value); else lens.uniforms[key].value = value;
  }
  const read = () => {
    const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  // Same synchronous task: no animation frame can move the scene between the two renders.
  composer.render(0);
  const merged = read();
  const reference = new lens.constructor({ uniforms: lens.uniforms, defines: { LENS_FX: 1 }, vertexShader: lens.material.vertexShader,
    fragmentShader: lens.material.fragmentShader.replace('#include <tonemapping_fragment>', '').replace('#include <colorspace_fragment>', '') });
  reference.uniforms = lens.uniforms; reference.material.uniforms = lens.uniforms;
  const output = new OutputPass();
  composer.passes = [...passes.filter(pass => pass !== lens), reference, output];
  try { composer.render(0); } finally { composer.passes = passes; }
  const old = read();
  reference.dispose(); output.dispose();
  let max = 0, over1 = 0;
  for (let i = 0; i < merged.length; i += 4) {
    const d = Math.max(Math.abs(merged[i] - old[i]), Math.abs(merged[i + 1] - old[i + 1]), Math.abs(merged[i + 2] - old[i + 2]));
    if (d > max) max = d; if (d > 1) over1++;
  }
  let lit = 0; for (let i = 0; i < merged.length; i += 4) if (merged[i] + merged[i + 1] + merged[i + 2] > 30) lit++;
  return { max, over1, pixels: merged.length / 4, lit };
}, set);

// The lens adds the bloom composite at each tap; the old chain blended the composite into the 4x MSAA scene target,
// resolved it again and had the lens read the sum. Bloom is raised so its share is large in every compared frame.
const compareBloomFold = (page, set) => page.evaluate(async set => {
  const { composer, renderer } = window.gameScene, gl = renderer.getContext(), passes = [...composer.passes];
  const lens = passes.at(-1), bloom = passes.find(pass => pass.blendMaterial);
  const { FullScreenQuad } = await import('/node_modules/three/examples/jsm/postprocessing/Pass.js');
  for (const [key, value] of Object.entries(set)) {
    if (Array.isArray(value)) lens.uniforms[key].value.fromArray(value); else lens.uniforms[key].value = value;
  }
  const read = () => {
    const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  const diff = (a, b) => {
    let max = 0, over1 = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d > max) max = d; if (d > 1) over1++;
    }
    return { max, over1 };
  };
  const quad = new FullScreenQuad(bloom.blendMaterial);
  const blendBack = { enabled: true, needsSwap: false, setSize() {}, render(r, write, readBuffer) {
    const auto = r.autoClear; r.autoClear = false;
    bloom.copyUniforms.tDiffuse.value = bloom.renderTargetsHorizontal[0].texture;
    r.setRenderTarget(readBuffer); quad.render(r); r.autoClear = auto;
  } };
  const reference = new lens.constructor({ uniforms: lens.uniforms, defines: { LENS_FX: 1 }, vertexShader: lens.material.vertexShader,
    fragmentShader: lens.material.fragmentShader.replace('+texture2D(tBloom,p).rgb', '') });
  reference.uniforms = lens.uniforms; reference.material.uniforms = lens.uniforms; reference.needsSwap = false;
  const masks = [], blit = gl.blitFramebuffer, { strength, threshold } = bloom;
  bloom.strength = 1.5; bloom.threshold = 0;
  // Same synchronous task: no animation frame can move the scene between the renders.
  try {
    gl.blitFramebuffer = (...args) => { masks.push(args[8]); return blit.apply(gl, args); };
    composer.render(0);
    gl.blitFramebuffer = blit;
    const folded = read();
    composer.passes = [...passes.slice(0, -1), blendBack, reference];
    composer.render(0);
    const old = read();
    composer.passes = passes; bloom.enabled = false;
    composer.render(0);
    const unbloomed = read();
    let lit = 0; for (let i = 0; i < folded.length; i += 4) if (folded[i] + folded[i + 1] + folded[i + 2] > 30) lit++;
    return { masks, color: gl.COLOR_BUFFER_BIT, pixels: folded.length / 4, lit, old: diff(folded, old), bloom: diff(folded, unbloomed) };
  } finally {
    gl.blitFramebuffer = blit; composer.passes = passes; bloom.enabled = true; bloom.strength = strength; bloom.threshold = threshold;
    reference.dispose(); quad.dispose();
  }
}, set);

// Pin the High tier: its 4x MSAA scene target is the one the merge must keep.
test.beforeEach(({ page }) => page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'high' }))));

test('post-processing writes one full-size MSAA target and matches the old Lens + OutputPass chain', async ({ gameplayPage: page }) => {
  // The composer has drawn once the scene target owns a framebuffer (the home showcase waits for its assets first).
  await page.waitForFunction(() => { const s = window.gameScene; return !!s && !!s.renderer.properties.get(s.composer.readBuffer).__webglFramebuffer; });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const state = await page.evaluate(() => {
    const { composer, renderer } = window.gameScene;
    return { passes: composer.passes.length, sceneSamples: composer.readBuffer.samples,
      spareTarget: !!renderer.properties.get(composer.writeBuffer).__webglFramebuffer,
      canvasDepth: renderer.getContext().getContextAttributes().depth };
  });
  // Stage B audit: only the lens quad draws to the canvas, so it carries no depth buffer (docs/performance/stage-b-audit.md).
  expect(state).toEqual({ passes: 3, sceneSamples: 4, spareTarget: false, canvasDepth: false });
  const compiled = await page.evaluate(() => {
    const { composer, renderer } = window.gameScene, lens = composer.passes.at(-1), before = renderer.info.programs.length;
    for (const boost of [1, 0, 1, 0]) { lens.uniforms.boost.value = boost; composer.render(0); }
    return renderer.info.programs.length - before;
  });
  expect(compiled, 'toggling lens effects swaps the two prebuilt variants, never compiles').toBe(0);
  for (const [name, set] of Object.entries(SETS)) {
    const diff = await compare(page, set);
    expect(diff.lit, `${name}: a real frame was compared`).toBeGreaterThan(diff.pixels / 4);
    // The old chain rounded the lens output to half float before tone mapping: at most one 8-bit step apart.
    expect(diff.max, `${name}: largest channel difference`).toBeLessThanOrEqual(1);
  }
});

test('the lens adds the bloom: one colour-only MSAA resolve per frame, same pixels as blending into the scene target', async ({ gameplayPage: page }) => {
  await page.waitForFunction(() => { const s = window.gameScene; return !!s && !!s.renderer.properties.get(s.composer.readBuffer).__webglFramebuffer; });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  for (const [name, set] of Object.entries(SETS)) {
    const result = await compareBloomFold(page, set);
    expect(result.masks, `${name}: the scene target resolves once, colour only (nothing reads its depth)`).toEqual([result.color]);
    expect(result.lit, `${name}: a real frame was compared`).toBeGreaterThan(result.pixels / 4);
    expect(result.bloom.over1, `${name}: the bloom visibly contributes`).toBeGreaterThan(result.pixels / 10);
    // Bilinear taps of the half-resolution composite at the offset taps; the sum is no longer rounded to half float.
    expect(result.old.max, `${name}: largest channel difference to the old blend chain`).toBeLessThanOrEqual(1);
  }
});
