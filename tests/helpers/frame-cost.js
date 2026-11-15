// Frame cost below vsync for the gated benchmarks. With vsync off, rAF intervals only time command submission; a
// 1-pixel readPixels before and after the composer drains the GPU, so each sample is the frame's real CPU + GPU
// render time. Needs the gameplay fixture's window.gameScene.
export const sampleFrameCost = (page, ms) => page.evaluate(async ms => {
  const { renderer, composer } = window.gameScene;
  const gl = renderer.getContext(), pixel = new Uint8Array(4), render = composer.render, times = [];
  composer.render = function (...args) {
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const start = performance.now();
    render.apply(this, args);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    times.push(performance.now() - start);
  };
  await new Promise(resolve => setTimeout(resolve, ms));
  composer.render = render;
  times.sort((a, b) => a - b);
  const at = q => +times[Math.min(times.length - 1, Math.floor(times.length * q))].toFixed(2);
  return { frames: times.length, p50: at(.5), p95: at(.95), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
}, ms);

export const gpuName = page => page.evaluate(() => {
  const gl = window.gameScene.renderer.getContext(), info = gl.getExtension('WEBGL_debug_renderer_info');
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
});

/** Opens `url` on the given VFX tier with the guide, tutorial, music and sound out of the way; the caller starts the race. */
export const openTier = async (page, url, vfx, wait = ms => ms) => {
  await page.evaluate(settings => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ ...settings, preset: 'cinematic', enabled: true }));
  }, vfx);
  await page.goto(url);
  for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(wait(400)); }
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};
