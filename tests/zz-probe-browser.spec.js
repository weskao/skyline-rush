import { test } from '@playwright/test';
test.use({ viewport: { width: 640, height: 400 } });
const sample = () => {
  window.__frames = [];
  const canvas = document.querySelector('#world');
  const gl = canvas.getContext('webgl2');
  const w = 16, px = new Uint8Array(w * w * 4);
  const loop = () => {
    let sum = 0, dark = 0, n = 0;
    for (const [x, y] of [[.2, .2], [.8, .2], [.5, .5], [.2, .8], [.8, .8]]) {
      gl.readPixels(Math.floor(canvas.width * x), Math.floor(canvas.height * y), w, w, gl.RGBA, gl.UNSIGNED_BYTE, px);
      for (let i = 0; i < px.length; i += 4) { const l = (px[i] + px[i + 1] + px[i + 2]) / 3; sum += l; if (l < 4) dark++; n++; }
    }
    window.__frames.push({ t: performance.now() | 0, mean: +(sum / n).toFixed(1), dark: +(dark / n).toFixed(3), phase: document.body.dataset.phase });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};
for (const track of ['coast', 'neon', 'canyon', 'aurora']) test(`probe ${track}`, async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => localStorage.setItem('skyline-rush-history', JSON.stringify(['coast', 'neon', 'canyon', 'aurora'].map(track => ({ date: '2026-01-01T12:00:00Z', track, position: 1, time: 60, score: 0, collisions: 0, nearMisses: 0, rings: 0, perfectLines: 0, nitroUses: 0, distance: 5000 })))));
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator(`[data-track="${track}"]`).click();
  await page.evaluate(sample);
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await page.keyboard.down('KeyW');
  const keys = ['KeyA', 'KeyD', 'Space', 'ShiftLeft', 'KeyE', 'KeyC'];
  for (let i = 0; i < 48; i++) {
    const k = keys[i % keys.length];
    await page.keyboard.down(k); await page.waitForTimeout(250 + (i * 37) % 300); await page.keyboard.up(k);
  }
  const frames = await page.evaluate(() => window.__frames);
  const median = frames.map(f => f.mean).sort((a, b) => a - b)[frames.length >> 1];
  const bad = frames.map((f, i) => ({ ...f, i })).filter(f => f.dark > 0.2 || f.mean < median * 0.4);
  console.log(track, 'frames', frames.length, 'median', median, 'bad', bad.length, JSON.stringify(bad.slice(0, 20)));
});
