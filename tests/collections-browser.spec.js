import { test, expect } from '@playwright/test';

for (const [width, height, hasTouch] of [[1440, 900, false], [390, 844, true], [320, 740, true], [844, 390, true]]) {
  test.describe(`collections ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch });
    test('garage previews are reversible and progression surfaces expose honest empty states', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/');
      await page.waitForTimeout(700);
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      const garageButton = page.getByRole('button', { name: 'Garage', exact: true });
      await expect(garageButton).toBeVisible({ timeout: 3000 });
      await garageButton.click();
      await expect(page.getByRole('dialog', { name: 'Garage' })).toBeVisible();
      await expect(page.locator('#garage-preview #world')).toBeVisible();
      await page.getByRole('button', { name: 'Preview coral' }).click();
      await expect(page.locator('#garage-status')).toContainText('Coral');
      await expect(page.locator('#garage-status')).toContainText('Preview only');
      await expect(page.getByRole('button', { name: 'Equip finish' })).toBeDisabled();
      await page.keyboard.press('Enter');
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
      await page.keyboard.press('Escape');
      await expect(garageButton).toBeFocused();
      await expect(page.locator('#app > #world')).toBeVisible();
      await garageButton.click();
      await expect(page.getByRole('button', { name: 'Preview pearl' })).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: 'Close garage' }).click();
      await page.locator('.history-button').click();
      await expect(page.locator('#daily-challenge')).toContainText('No daily challenge');
      await expect(page.getByRole('button', { name: 'Start daily challenge' })).toBeDisabled();
      await expect(page.locator('#achievement-list > li')).toHaveCount(4);
      await expect(page.locator('#daily-board')).toContainText('No challenge runs');
      await page.getByRole('button', { name: 'Close history' }).click();
      await page.locator('#controls-button').click();
      await expect(page.getByRole('checkbox', { name: 'Show best-run ghost' })).toBeDisabled();
      await page.locator('#controls-button').click();
      await page.locator('#start-button').click();
      await expect(page.locator('#race-status')).toHaveText('RACING');
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  });
}
