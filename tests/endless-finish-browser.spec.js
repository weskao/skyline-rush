import { test } from './helpers/gameplay-browser.js';
import { expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

// Endless used to save only Coast runs: on any other track the last collision froze the race view
// with no results screen. Taipei is the reported route; Sky Spiral covers the 3D road.
for (const id of ['taipei', 'spiral']) {
  test(`Endless ${id}: the last collision shows the results screen and Race Again starts a new run`, async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(90000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(track => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', track])), id);
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('button[data-race-mode="endless"]').click();
    await page.locator(`[data-track="${id}"]`).click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
    await page.evaluate(() => { window.gameplay.race.player.collisions = 5; });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
    await expect(page.locator('#race-overlay')).toBeVisible();
    await expect(page.locator('#result-stats')).toBeVisible();
    await page.screenshot({ path: `artifacts/endless/${id}-finish.png`, animations: 'disabled' });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-mode-history-v1')).length)).toBe(1);
    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(await page.evaluate(() => window.gameplay.race.player.collisions)).toBe(0);
    expect(errors).toEqual([]);
  });
}
