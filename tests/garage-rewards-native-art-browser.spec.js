import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

test('actual Garage mission cards and source icons preserve native 3x alpha on mobile and desktop', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const board = page.locator('.garage-mission-board');
    await expect(board).toBeVisible();
    await expect(board).toHaveAttribute('data-mission-state', 'unavailable');
    await expect(board.locator('.garage-mission-card')).toHaveCount(4);
    await expect(board).toContainText('Verified mission progress is unavailable');
    await expect(board).not.toContainText(/claim reward|reward received|領取獎勵|已領取/);
    for (const img of await board.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute('width', '96');
      await expect(img).toHaveAttribute('height', '96');
      await expect(img).toHaveJSProperty('naturalWidth', 288);
      await expect(img).toHaveJSProperty('naturalHeight', 288);
      expect(await img.evaluate(image => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 288;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, 288, 288).data;
        let left = 288, top = 288, right = -1, bottom = -1;
        for (let y = 0; y < 288; y++) for (let x = 0; x < 288; x++) {
          if (pixels[(y * 288 + x) * 4 + 3] > 16) {
            left = Math.min(left, x); top = Math.min(top, y);
            right = Math.max(right, x); bottom = Math.max(bottom, y);
          }
        }
        return Math.min(left, top, 287 - right, 287 - bottom);
      })).toBeGreaterThanOrEqual(20);
    }
  }
});

test('Garage Missions stay truthful in Traditional Chinese and fall back on missing artwork', async ({ page }) => {
  await page.route('**/mission-race@3x.png', route => route.abort());
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  const board = page.locator('.garage-mission-board');
  await expect(board).toContainText('任務中心');
  await expect(board).toContainText('目前尚無已驗證的任務進度');
  await expect(board.locator('[data-mission-id="mission-race"] .artwork-fallback')).toBeVisible();
  await expect(board.locator('[data-mission-id="mission-race"]')).toContainText('競速挑戰');
  await expect(board).not.toContainText(/領取|已完成|已獲得/);
});
