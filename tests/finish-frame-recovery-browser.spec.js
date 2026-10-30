import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// One failing frame on the results screen (a GPU hiccup, an audio node refusing a value) once froze the
// picture for good: the next frame was only requested after the whole frame succeeded, so every button
// stopped responding until a reload.
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) {
  test.describe(`finish frame recovery ${name}`, () => {
    test.use({ viewport, hasTouch });

    test('one throwing frame after the finish leaves the game running and Race again working', async ({ gameplayPage: page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.evaluate(() => localStorage.setItem('skyline-rush-guide-seen', '1'));
      await page.reload();
      await page.locator('#start-button').click();
      await expect(page.locator('#race-status')).toHaveText('RACING');
      await page.evaluate(() => {
        const race = window.gameplay.race;
        race.elapsed = 90;
        Object.assign(race.player, { distance: race.length - 8, speed: 70, steering: 0, x: 2.5 });
        race.rivals.forEach(r => { r.finishTime = null; r.distance = Math.min(r.distance, race.length - 100); });
      });
      await expect(page.locator('#race-overlay')).toBeVisible();
      await page.evaluate(() => {
        const { composer } = window.gameScene;
        const render = composer.render;
        composer.render = () => {
          composer.render = render;
          throw new Error('injected frame failure');
        };
      });
      await expect.poll(() => errors).toContain('injected frame failure');
      const frame = () => page.evaluate(() => window.gameScene.renderer.info.render.frame);
      const before = await frame();
      await expect.poll(frame).toBeGreaterThan(before);
      await page.locator('#again-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'countdown');
      await expect(page.locator('#race-overlay')).toBeHidden();
      expect(errors).toEqual(['injected frame failure']);
    });
  });
}
