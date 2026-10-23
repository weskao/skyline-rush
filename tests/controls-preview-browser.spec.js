import { test, expect } from './helpers/test.js';

for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height }, ...(width < 761 || height < 501 ? { hasTouch: true, isMobile: true } : {}) });
    test('the Controls panel previews touch button size and opacity as they change', async ({ page }) => {
      await page.goto('/');
      await page.locator('#controls-button').click();
      const keys = page.locator('.controls-preview-keys');
      const nitro = page.locator('.controls-preview .touch-nitro');
      await expect(nitro).toBeVisible();
      const medium = (await nitro.boundingBox()).width;
      await page.locator('[data-controls="size"][value="L"]').check();
      await expect.poll(async () => (await nitro.boundingBox()).width).toBeGreaterThan(medium * 1.1);
      await page.locator('[data-controls="size"][value="S"]').check();
      await expect.poll(async () => (await nitro.boundingBox()).width).toBeLessThan(medium * 0.9);
      await page.locator('[data-controls="opacity"]').fill('0.5');
      await expect.poll(() => keys.evaluate(el => getComputedStyle(el).opacity)).toBe('0.5');
      // Stays visible while the sliders at the bottom of the scrolling panel are used.
      await page.locator('[data-controls="opacity"]').scrollIntoViewIfNeeded();
      const [panel, preview] = [await page.locator('#controls-panel').boundingBox(), await page.locator('.controls-preview').boundingBox()];
      expect(preview.y).toBeGreaterThanOrEqual(panel.y - 1);
      expect(preview.y + preview.height).toBeLessThanOrEqual(panel.y + panel.height + 1);
    });
  });
}
