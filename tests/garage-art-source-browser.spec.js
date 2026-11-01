import { test, expect } from './helpers/test.js';

test('Garage source artwork is available at native 3x resolution with 1x CSS display without granting capabilities', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const source = page.locator('#garage-art-source-garage-store-readiness');
  await expect(source).toBeVisible();
  await source.locator('summary').click();
  const thumbnails = source.locator('img');
  await expect(thumbnails).toHaveCount(6);
  const first = thumbnails.first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toHaveAttribute('width', '72');
  await expect(first).toHaveAttribute('height', '72');
  await expect(first).toHaveJSProperty('naturalWidth', 216);
  await expect(source).not.toContainText(/buy now|purchase|claim reward|立即購買|立即領取/i);
});
