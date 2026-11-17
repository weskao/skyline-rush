import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

for (const [name, width, height, touch] of [
  ['desktop', 1440, 900, false],
  ['landscape phone', 844, 390, true],
]) {
  test.describe(name, () => {
    test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });

    test('the same settings gear opens at home, paused, and finished', async ({ gameplayPage: page }) => {
      const gear = page.locator('#settings-button');
      const dialog = page.locator('#settings-panel');
      const body = page.locator('body');
      const openAndClose = async phase => {
        await expect(gear).toBeVisible();
        await gear.click();
        await expect(dialog).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(gear).toBeFocused();
        await expect(body).toHaveAttribute('data-phase', phase);
      };

      await openAndClose('ready');
      await page.locator('#start-button').click();
      await expect(body).toHaveAttribute('data-phase', 'countdown');
      await expect(gear).toBeHidden();
      await expect(body).toHaveAttribute('data-phase', 'racing');
      await expect(gear).toBeHidden();
      await page.locator('#pause-button').click();
      await expect(body).toHaveAttribute('data-phase', 'paused');
      await expect(page.locator('#race-overlay button[aria-controls="settings-panel"]')).toHaveCount(0);
      await openAndClose('paused');
      await page.locator('#resume-button').click();
      await expect(body).toHaveAttribute('data-phase', 'racing');
      await expect(gear).toBeHidden();

      await page.evaluate(() => {
        const { race } = window.gameplay;
        race.elapsed = 80;
        Object.assign(race.player, { distance: race.length - 10, speed: 60 });
      });
      await expect(body).toHaveAttribute('data-phase', 'finished');
      await openAndClose('finished');
    });
  });
}
