import { clickLobbyOption } from './helpers/home-lobby.js';
import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// A road gap reads on the live race minimap in both phone orientations: the route line is cut,
// orange caps cross it at takeoff and landing, and every mark stays inside the map
// (`.claude/rules/route-minimap.md`). Coast has no gap and draws none.
const GAPS = { canyon: 1, spiral: 3, coast: 0 };
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone portrait', { width: 390, height: 844 }, true],
  ['phone landscape', { width: 844, height: 390 }, true],
]) test.describe(`minimap gap marks ${name}`, () => {
  test.use({ viewport, hasTouch });
  for (const [track, count] of Object.entries(GAPS)) test(`${track} marks ${count} gap(s) on the race map`, async ({ gameplayPage: page }) => {
    await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon', 'aurora', 'spiral'])));
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await clickLobbyOption(page, `[data-track="${track}"]`);
    await page.locator('#start-button').click();
    await page.evaluate(() => { window.gameplay.race.countdown = .01; });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10000) });
    const map = page.locator('#race-route-map');
    await expect(map).toBeVisible();
    if (!count) {
      await expect(map.locator('.route-gap-cut, .route-gap-dots, .route-gap-caps')).toHaveCount(0);
      return;
    }
    const result = await map.evaluate(root => {
      const caps = root.querySelector('.route-gap-caps'), cut = root.querySelector('.route-gap-cut');
      const box = root.getBoundingClientRect(), capBox = caps.getBoundingClientRect();
      return {
        subpaths: (cut.getAttribute('d').match(/M/g) ?? []).length,
        capColor: getComputedStyle(caps).stroke, cutColor: getComputedStyle(cut).stroke,
        background: getComputedStyle(root).backgroundColor,
        inside: capBox.left >= box.left - 1 && capBox.right <= box.right + 1 && capBox.top >= box.top - 1 && capBox.bottom <= box.bottom + 1,
        visible: capBox.width > 1 && capBox.height > 1,
      };
    });
    expect(result.subpaths).toBe(count);
    expect(result.visible, 'caps have a visible size').toBe(true);
    expect(result.inside, 'caps stay inside the map').toBe(true);
    expect(result.capColor).toBe('rgb(255, 123, 84)');
    expect(result.cutColor, 'the cut is the map background').toBe(result.background);
  });
});
