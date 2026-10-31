import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 740 }]) {
  test(`scenario 1 — Full-screen entry stays within safe viewport ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
    await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'studio');
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    const box = await page.locator('#garage-screen').boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 2);
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 2);
    await expect(page.locator('#garage-close')).toBeInViewport();
    const preview = page.locator('#garage-preview');
    await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
    const bounds = JSON.parse((await preview.getAttribute('data-car-bounds')) ?? '{}');
    expect(bounds.maxX).toBeLessThan(0.94);
    expect(bounds.minX).toBeGreaterThan(-0.94);
    const shot = await page.locator('#garage-preview #world').screenshot();
    await test.info().attach(`garage-real-webgl-${viewport.width}x${viewport.height}`, { body: shot, contentType: 'image/png' });
    const drawCalls = Number(await preview.getAttribute('data-draw-calls'));
    const triangles = Number(await preview.getAttribute('data-triangles'));
    expect(drawCalls).toBeGreaterThan(0);
    expect(triangles).toBeGreaterThan(0);
  });
}

test('scenario 2 — Orbit works with accessible camera buttons and drag', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await page.locator('[data-garage-angle="top"]').click();
  await expect(page.locator('[data-garage-angle="top"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#garage-reset').click();
  await expect(page.locator('#garage-auto-rotate')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#garage-preview').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#garage-auto-rotate')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#garage-zoom-in').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-camera-zoom', '0.850');
  await page.locator('#garage-zoom-out').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-camera-zoom', '0.977');
  await page.locator('#garage-preview').hover();
  await page.mouse.wheel(0, 100);
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-camera-zoom', '1.080');
});

test('scenario 3 — Paint migration preserves original entitlement after preview and close', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await page.locator('[data-paint="obsidian"]').click();
  await expect(page.locator('#garage-equip')).toBeDisabled();
  await page.locator('#garage-close').click();
  await expect(page.locator('#garage-screen')).toBeHidden();
  await page.locator('#garage-button').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('aria-pressed', 'true');
});

test('scenario 4 — Browser back releases Studio without trapping race controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await page.goBack();
  await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
  await page.goBack();
  await expect(page.locator('#garage-screen')).toBeHidden();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).not.toHaveAttribute('data-phase', 'ready');
});

test('studio design — paint states and default restoration reflect actual ownership', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('data-state', 'equipped');
  await expect(page.locator('[data-paint="obsidian"]')).toHaveAttribute('data-state', 'locked');
  await page.locator('[data-paint="obsidian"]').click();
  await expect(page.locator('#garage-equip')).toBeDisabled();
  await page.locator('#garage-restore-default').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-preview #world')).toBeVisible();
});

// Regression: the showroom is announced in the selected language, not as an English-only aria label.
test('garage showroom accessible label follows the active locale', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen .garage-visual')).toHaveAttribute('aria-label', '3D 車輛展示間');
  await page.locator('#garage-close').click();
  await selectLocale(page, 'en');
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen .garage-visual')).toHaveAttribute('aria-label', '3D vehicle showroom');
});

test('restoring default paint persists an equipped owned finish across close and reopen', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-stars', JSON.stringify({ coast: 3 }));
    localStorage.setItem('skyline-rush-paint', JSON.stringify('aurora'));
  });
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('[data-paint="aurora"]')).toHaveAttribute('data-state', 'equipped');
  await page.locator('#garage-restore-default').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('data-state', 'equipped');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-paint')))).toBe('pearl');
  await page.locator('#garage-close').click();
  await expect(page.locator('#garage-screen')).toBeHidden();
  await page.locator('#garage-button').click();
  await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('data-state', 'equipped');
});

test('locked paint state is announced in active language without pretending it is owned', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('[data-paint="obsidian"]')).toHaveAttribute('aria-label', /未解鎖/);
  await page.locator('[data-paint="obsidian"]').click();
  await expect(page.locator('#garage-equip')).toBeDisabled();
  await expect(page.locator('#garage-restore-default')).toBeVisible();
});
