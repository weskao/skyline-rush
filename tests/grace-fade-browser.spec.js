import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// After a hit the car cannot be hit again for a moment (car.cooldown); the player must see that window.
const bodyOpacity = page => page.evaluate(() => window.gameScene.player.userData.body.material.opacity);

test('the player car turns see-through during the post-hit grace and solid once it ends', async ({ gameplayPage: page }) => {
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  expect(await bodyOpacity(page)).toBe(1); // settled: no hit yet, nothing has faded the car
  await page.evaluate(() => { window.gameplay.race.player.cooldown = 1.5; }); // the grace knock() starts
  await expect.poll(() => bodyOpacity(page), { timeout: ciTimeout(5_000) }).toBeLessThan(0.75);
  await expect.poll(() => bodyOpacity(page), { timeout: ciTimeout(15_000) }).toBe(1);
});
