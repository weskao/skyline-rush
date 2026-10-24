import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

test('History exposes cloud recovery and sign-in on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.locator('#intro [data-open-history=""]').click();
  const dialog = page.locator('#history-screen');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#cloud-title')).toHaveText('Cloud save');
  await expect(dialog.locator('#cloud-login')).toBeVisible();
  await expect(dialog.locator('#cloud-login')).toHaveAccessibleName('Sign in with Google');
  await expect(dialog.locator('#cloud-status')).toHaveText('Cloud backup is off. Sign in to protect your race results.');
  await expect.poll(() => dialog.locator('#cloud-login img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(dialog.locator('#cloud-logout')).toBeHidden();
  await dialog.locator('#history-close').click();
  await selectLocale(page, 'zh-TW');
  await page.locator('#intro [data-open-history=""]').click();
  await expect(dialog.locator('#cloud-login')).toHaveAccessibleName('使用 Google 登入');
});
