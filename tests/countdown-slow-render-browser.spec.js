import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

test('a slow renderer does not stretch the starting countdown', async ({ page, gameplayURL }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
    localStorage.setItem('skyline-rush-tutorial-completed', '1');
    localStorage.setItem('skyline-rush-music', 'off');
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(function waitForFrame(time) {
      if (document.body?.dataset.phase === 'countdown' && time - lastFrame < 250) raf(waitForFrame);
      else { lastFrame = time; callback(time); }
    });
    let lastFrame = 0;
  });
  await page.goto(gameplayURL);
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
  // The grid holds on "loading" until the car, scenery and pickups are ready (556d163c); only the 3-2-1 after it is the countdown.
  await expect(page.locator('#countdown')).not.toHaveAttribute('data-step', 'loading', { timeout: ciTimeout(15000) });
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(4000) });
});
