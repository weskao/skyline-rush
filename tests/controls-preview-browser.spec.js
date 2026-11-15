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
      // Sits right under the opacity slider, so both are on screen while that slider is dragged.
      await page.locator('.controls-preview').scrollIntoViewIfNeeded();
      const [panel, slider, preview] = await Promise.all(['#controls-panel', '[data-controls="opacity"]', '.controls-preview'].map(s => page.locator(s).boundingBox()));
      expect(slider.y).toBeGreaterThanOrEqual(panel.y - 1);
      expect(preview.y).toBeGreaterThan(slider.y);
      expect(preview.y + preview.height).toBeLessThanOrEqual(panel.y + panel.height + 1);
    });
  });
}

test.describe('editing touch layouts', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('the editor is in the first Controls screen and keeps orientation drafts separate', async ({ page }, testInfo) => {
    const key = 'skyline-rush-controls-layout-v2';
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#controls-button').click();
    const edit = page.getByRole('group', { name: 'Touch layout' }).locator('#layout-edit');
    await expect(edit).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('group', { name: 'Steering', exact: true }).locator('#controls-sensitivity')).toHaveCount(1);
    await expect(page.locator('#tilt-enable')).toBeHidden();
    await edit.click();
    const orientation = page.locator('#layout-orientation');
    await expect(orientation).toHaveText('Portrait layout');
    const nitro = page.locator('#touch-controls [data-control="nitro"]');
    const startDrag = async (dx, dy) => {
      const box = await nitro.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy);
    };
    const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    await startDrag(-18, -40);
    await page.mouse.up();
    const portrait = (await saved()).portrait;
    expect(portrait.nitro).toBeDefined();

    await startDrag(-14, 35);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(orientation).toHaveText('Landscape layout');
    await page.mouse.move(600, 200);
    await page.mouse.up();
    expect(await saved()).toEqual({ version: 2, portrait, landscape: {} });

    await startDrag(-40, -40);
    await page.mouse.up();
    const landscape = (await saved()).landscape;
    expect(landscape.nitro).toBeDefined();
    await page.screenshot({ path: testInfo.outputPath('landscape-editor.png'), scale: 'css' });
    await page.locator('#layout-done').click();
    await page.reload();
    expect(await saved()).toEqual({ version: 2, portrait, landscape });
    await page.locator('#controls-button').click();
    await edit.click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(orientation).toHaveText('Portrait layout');
    await expect(nitro).toHaveClass(/is-positioned/);
  });
});
