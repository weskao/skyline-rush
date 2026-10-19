import { test, expect } from '@playwright/test';

const records = Array.from({ length: 12 }, (_, i) => ({
  date: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00Z`, track: 'coast',
  position: i === 11 ? 1 : 3, time: 90 - i, score: i * 100, collisions: 0,
  nearMisses: i, rings: 2, perfectLines: 0, nitroUses: 1, distance: 5000,
}));
const open = async page => {
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};
const seed = page => page.addInitScript(records => {
  localStorage.setItem('skyline-rush-history', JSON.stringify([...records,
    { ...records[0], track: 'neon', position: 2, time: 66 },
    { ...records[0], track: 'canyon', position: 3, time: 88 },
  ]));
}, records);

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
  ['small phone', { width: 320, height: 740 }, true],
  ['landscape', { width: 844, height: 390 }, true],
]) test.describe(name, () => {
  test.use({ viewport, hasTouch });
  test('History filters real saved runs, marks the best and charts the last ten', async ({ page }) => {
    await seed(page);
    await open(page);
    await page.getByRole('button', { name: 'History', exact: true }).click();
    const history = page.getByRole('dialog', { name: 'Race history' });
    await expect(history).toBeVisible();
    await expect(page.locator('.history-run')).toHaveCount(12);
    await expect(page.locator('.history-best')).toHaveCount(1);
    await expect(page.locator('.history-run').first()).toContainText('01:19.00');
    await expect(page.locator('#history-chart circle')).toHaveCount(10);
    const ys = await page.locator('#history-chart circle').evaluateAll(points => points.map(point => Number(point.getAttribute('cy'))));
    expect(ys.at(-1)).toBeGreaterThan(ys[0]); // improving times descend toward the faster/lower end
    await page.locator('.history-run summary').first().click();
    await expect(page.locator('.history-run p').first()).toBeVisible();
    const chart = await page.locator('#history-chart').boundingBox();
    expect(chart.x).toBeGreaterThanOrEqual(0);
    expect(chart.x + chart.width).toBeLessThanOrEqual(viewport.width);
    await page.getByLabel('History track').selectOption('neon');
    await expect(page.locator('.history-run')).toHaveCount(1);
    await expect(page.locator('.history-run')).toContainText('01:06.00');
    await expect(page.locator('#history-chart circle')).toHaveCount(1);
    await page.getByRole('button', { name: 'Close history' }).click();
    await expect(history).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'History', exact: true })).toBeFocused();
  });

  test('track selection changes the real scene and restart retains the chosen track', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await seed(page);
    await open(page);
    for (const id of ['neon', 'canyon', 'aurora', 'coast', 'neon']) {
      await page.locator(`[data-track="${id}"]`).scrollIntoViewIfNeeded();
      await page.locator(`[data-track="${id}"]`).click();
      await expect(page.locator(`[data-track="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#world')).toHaveAttribute('aria-label', new RegExp(id === 'neon' ? 'Neon Downtown' : id === 'canyon' ? 'Canyon Skyway' : id === 'aurora' ? 'Aurora Pass' : 'Coast'));
      await page.waitForTimeout(180); // compile and draw each real track shader
    }
    await page.getByRole('button', { name: 'Start race', exact: true }).click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await expect(page.locator('#race-length')).toHaveText('4.00');
    if (hasTouch) {
      const gauge = await page.locator('.fuel-stat').boundingBox();
      const nitro = await page.locator('[data-control="nitro"]').boundingBox();
      expect(gauge.y + gauge.height <= nitro.y || gauge.x + gauge.width <= nitro.x || gauge.x >= nitro.x + nitro.width).toBe(true);
    }
    await page.getByRole('button', { name: 'Restart race', exact: true }).click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await expect(page.locator('#race-length')).toHaveText('4.00');
    expect(errors).toEqual([]);
  });
});

test('fresh progress locks tracks, empty History works and Escape restores menu focus', async ({ page }) => {
  await open(page);
  await expect(page.locator('[data-track="neon"]')).toBeDisabled();
  await expect(page.locator('#track-note')).toContainText('Finish top 3 on Coast to unlock Neon Downtown');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.locator('#history-empty')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Race history' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'History', exact: true })).toBeFocused();
});

test('track changes render four distinct sky palettes in the WebGL framebuffer', async ({ page }) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const skies = [];
  for (const id of ['coast', 'neon', 'canyon', 'aurora']) {
    await page.locator(`[data-track="${id}"]`).click();
    await page.waitForTimeout(200);
    skies.push(await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
      const canvas = document.querySelector('#world');
      const gl = canvas.getContext('webgl2');
      const color = new Uint8Array(4);
      gl.readPixels(Math.floor(canvas.width * .6), Math.floor(canvas.height * .85), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, color);
      resolve([...color].slice(0, 3));
    }))));
  }
  expect(new Set(skies.map(color => color.join(','))).size).toBe(4);
  for (const color of skies) expect(color.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(30);
  expect(skies[2][0]).toBeGreaterThan(skies[2][2]); // desert's warm sky
});

test('fuel warns below 20%, refill feedback appears and comfort disables gauge motion', async ({ page }) => {
  await open(page);
  await page.locator('#assist-button').click();
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('Shift');
  // CPU-only CI simulates slower than wall-clock (frame gaps are clamped), so draining takes longer there.
  await expect(page.locator('#fuel-meter')).toHaveAttribute('aria-valuetext', /Low charge/, { timeout: process.env.CI ? 48000 : 16000 });
  await page.keyboard.up('Shift');
  await expect(page.locator('#fuel-meter')).toHaveAttribute('data-refilling', 'true');
  await page.locator('#vfx-panel > summary').click();
  await page.locator('[data-vfx="comfortable"]').check();
  expect(await page.locator('#fuel-fill').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  expect(await page.locator('#fuel-meter').evaluate(el => getComputedStyle(el, '::after').animationName)).toBe('none');
});

test.describe('slide-pad feedback', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test('hint fades, active pad follows the thumb, release and pause clear it', async ({ page, context }) => {
    await open(page);
    await page.getByRole('button', { name: 'Start race', exact: true }).click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    const ring = page.locator('.pad-ring');
    await expect(ring).toHaveCSS('opacity', '0.25');
    await expect(ring).toHaveCSS('opacity', '0', { timeout: 10000 });
    const session = await context.newCDPSession(page);
    const pad = await page.locator('.touch-pad').boundingBox();
    const point = { id: 1, x: pad.x + 45, y: pad.y + 55 };
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: point.x + 65, y: point.y + 45 }] });
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-pad-brake', 'true');
    await expect(ring).toHaveCSS('opacity', '0.35');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(ring).toHaveCSS('opacity', '0');
    await expect(page.locator('#touch-controls')).not.toHaveAttribute('data-pad-brake');
    await page.locator('#pause-button').click();
    await expect(page.locator('#touch-controls')).toBeHidden();
  });
});
