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
