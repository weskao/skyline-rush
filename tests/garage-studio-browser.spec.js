import { test, expect } from './helpers/test.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
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
