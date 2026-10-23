import { test, expect } from './helpers/test.js';

test('History exposes cloud recovery and sign-in on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.locator('.history-button').click();
  const dialog = page.locator('#history-screen');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#cloud-title')).toHaveText('Cloud save');
  await expect(dialog.locator('#cloud-login')).toBeVisible();
  await expect(dialog.locator('#cloud-status')).toHaveText('Race progress is saved on this device only.');
  await expect(dialog.locator('#cloud-logout')).toBeHidden();
});
