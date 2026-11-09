import { test } from './helpers/gameplay-browser.js';
import { expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

for (const id of ['coast', 'spiral']) {
  test(`Elimination ${id} never stalls at the original finish or ends after five collisions`,
    async ({ gameplayPage: page }) => {
      test.setTimeout(ciTimeout(120000));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked',
        JSON.stringify(['coast', 'neon', 'canyon', 'aurora', 'spiral'])));
      await page.reload();
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      await page.locator('button[data-race-mode="elimination"]').click();
      await page.locator(`[data-track="${id}"]`).click();
      await expect(page.locator('#start-button')).toBeEnabled();
      await page.locator('#start-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
      await page.evaluate(() => {
        const race = window.gameplay.race;
        race.player.distance = 85_000;
        race.player.speed = 70;
        race.player.cooldown = 5;
        race.player.collisions = 5;
      });
      await expect.poll(() => page.evaluate(() => window.gameplay.race.player.distance)).toBeGreaterThan(85_000);
      const outcome = await page.evaluate(() => {
        const race = window.gameplay.race;
        return { mode: race.mode, phase: race.phase, endless: !!race.endless,
          course: !!race.course, drivers: race.rivals.length, collisions: race.player.collisions,
          distance: race.player.distance, finish: race.length };
      });
      expect(outcome.mode).toBe('elimination');
      expect(outcome.phase).toBe('racing');
      expect(outcome.endless).toBe(true);
      expect(outcome.course).toBe(false);
      expect(outcome.distance).toBeGreaterThan(outcome.finish);
      expect(outcome.drivers).toBe(7);
      expect(outcome.collisions).toBeGreaterThanOrEqual(5);
      expect(errors).toEqual([]);
    });
}
