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
      // The 3-2-1 can end before a slow runner's next expect: count gear-visible countdown frames in the page.
      await page.evaluate(() => {
        const seen = window.__countdownGear = { frames: 0, gear: 0 };
        const sample = () => {
          if (document.body.dataset.phase === 'countdown') { seen.frames++; if (document.querySelector('#settings-button')?.checkVisibility()) seen.gear++; }
          if (document.body.dataset.phase !== 'racing') requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      await page.locator('#start-button').click();
      await expect(body).toHaveAttribute('data-phase', 'countdown');
      await expect(body).toHaveAttribute('data-phase', 'racing');
      const counted = await page.evaluate(() => window.__countdownGear);
      expect(counted.frames).toBeGreaterThan(0);
      expect(counted.gear).toBe(0);
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
