import { test, expect } from './helpers/test.js';

const KEYBOARD_ONLY = ['.keymap-field', '#keymap-status', '#keymap-reset'];
const openControls = async page => {
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#controls-button').click();
  await expect(page.locator('#layout-edit')).toBeVisible();
};

test('desktop shows keyboard remapping in Controls', async ({ page }) => {
  await openControls(page);
  for (const selector of KEYBOARD_ONLY) await expect(page.locator(selector)).toBeVisible();
});

test.describe('touch device', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('hides keyboard remapping until a physical key is pressed, then remembers the keyboard', async ({ page }) => {
    await openControls(page);
    for (const selector of KEYBOARD_ONLY) await expect(page.locator(selector)).toBeHidden();
    // A Bluetooth keyboard on a phone or tablet: its first real key reveals the remapping.
    await page.keyboard.press('Shift');
    for (const selector of KEYBOARD_ONLY) await expect(page.locator(selector)).toBeVisible();
    await page.locator('[data-rebind="fly"]').click();
    await page.keyboard.press('KeyF');
    await expect(page.locator('[data-rebind="fly"]')).toContainText('F');
    await page.reload();
    await page.waitForTimeout(700);
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('#controls-button').click();
    for (const selector of KEYBOARD_ONLY) await expect(page.locator(selector)).toBeVisible();
  });
});
