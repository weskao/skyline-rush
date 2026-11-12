import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// The bonus is a section of the podium, not a viewport-fixed toast. It must never
// jump to a corner or cover the Race again / Next / cloud controls at any size.
for (const viewport of [
  { width: 390, height: 844 }, // phone portrait
  { width: 844, height: 390 }, // phone landscape
  { width: 768, height: 1024 }, // tablet portrait
  { width: 1440, height: 900 }, // desktop
]) {
  test.describe(`Wave 3 earned results layout ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: viewport.width < 900 });

    test('reward stays with the result summary and clear of action targets', async ({ gameplayPage: page }) => {
      await page.locator('#start-button').click();
      await expect(page.locator('#race-status')).toHaveText('RACING');
      await page.evaluate(() => {
        const race = window.gameplay.race;
        race.elapsed = 80;
        Object.assign(race.player, { distance: race.length - 10, speed: 60 });
      });
      const reward = page.locator('.wave3-demo-results--earned');
      await expect(reward).toBeVisible({ timeout: ciTimeout(6000) });

      const geometry = () => page.evaluate(() => {
        const reward = document.querySelector('.wave3-demo-results--earned');
        const summary = document.querySelector('#race-overlay .overlay-summary');
        const actions = document.querySelector('#race-overlay .overlay-actions');
        const b = reward.getBoundingClientRect();
        const s = summary.getBoundingClientRect();
        const a = actions.getBoundingClientRect();
        return {
          inline: reward.parentElement === summary && getComputedStyle(reward).position === 'static',
          withinSummary: b.left >= s.left - 1 && b.right <= s.right + 1,
          clearOfActions: b.right <= a.left + 1 || b.left >= a.right - 1 ||
            b.bottom <= a.top + 1 || b.top >= a.bottom - 1,
        };
      });
      await expect.poll(geometry, { timeout: ciTimeout(4000) }).toEqual({
        inline: true, withinSummary: true, clearOfActions: true,
      });
      // The result entrance may slide the entire summary. The reward must retain
      // its relative position, rather than reanchoring after the transform ends.
      const relative = () => reward.evaluate(node => {
        const r = node.getBoundingClientRect();
        const s = node.parentElement.getBoundingClientRect();
        return { x: r.left - s.left, y: r.top - s.top };
      });
      const before = await relative();
      await page.waitForFunction(() =>
        [...document.querySelector('.overlay-content').getAnimations()].every(animation => animation.playState !== 'running'));
      const after = await relative();
      expect(Math.abs(after.x - before.x)).toBeLessThan(3);
      expect(Math.abs(after.y - before.y)).toBeLessThan(3);
    });
  });
}
