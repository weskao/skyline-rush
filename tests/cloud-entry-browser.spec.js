import { test, expect } from './helpers/test.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 568 }]) {
  test(`home cloud save entry opens account recovery at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const entry = page.locator('#cloud-open');
    await expect(entry).toBeVisible();
    await expect(entry).toBeInViewport();
    await expect(entry).toHaveAccessibleName('Cloud save');
    await expect(entry.locator('xpath=..')).toHaveClass('route-label');
    await entry.click();
    await expect(page.locator('#history-screen')).toBeVisible();
    await expect(page.locator('#cloud-login')).toBeFocused();
    await expect(page.locator('#cloud-login')).toHaveAccessibleName('Sign in with Google');
    await page.locator('#history-close').click();
    await expect(entry).toBeFocused();
  });
}
