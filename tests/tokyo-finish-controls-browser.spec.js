import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { selectLocale } from './helpers/locale-browser.js';
import { RACE_TRACKS, ROAD_LIMIT } from '../src/game.js';

const trackIds = Object.keys(RACE_TRACKS);
const tokyoIndex = trackIds.indexOf('tokyo');

async function collidedTokyoFinish(page) {
  await page.evaluate(unlocked => {
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(unlocked));
    localStorage.setItem('skyline-rush-guide-seen', '1');
  }, trackIds.slice(0, tokyoIndex + 1));
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('[data-track="tokyo"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  // Exercise actual simulation impacts before the results UI is shown.
  // Repeat only after pulling clear, so each is a new contact.
  for (let i = 0; i < 2; i++) {
    await page.evaluate(({ distance, limit }) => {
      const race = window.gameplay.race;
      Object.assign(race.player, {
        distance, speed: 70, x: limit, steering: 1,
        railContactSide: 0, cooldown: 0, altitude: 0,
      });
    }, { distance: 900 + i * 300, limit: ROAD_LIMIT });
    await expect.poll(() => page.evaluate(() => window.gameplay.race.player.collisions)).toBeGreaterThan(i);
  }
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.elapsed = 90;
    Object.assign(race.player, { distance: race.length - 8, speed: 70, steering: 0, x: 2.5 });
    race.rivals.forEach(r => { r.finishTime = null; r.distance = Math.min(r.distance, race.length - 100); });
  });
  await expect(page.locator('#race-overlay')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
}

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) {
  test.describe(`Tokyo finish controls ${name}`, () => {
    test.use({ viewport, hasTouch });

    test('collisions do not block camera, language, and next-track actions at the finish', async ({ gameplayPage: page }, testInfo) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await collidedTokyoFinish(page);
      await expect(page.locator('#next-button')).toBeVisible();
      const camera = page.locator('#camera-button');
      const wasPressed = await camera.getAttribute('aria-pressed');
      await camera.click();
      await expect(camera).toHaveAttribute('aria-pressed', wasPressed === 'true' ? 'false' : 'true');
      await selectLocale(page, 'zh-TW');
      await expect(page.locator('#next-button')).toContainText('下一');
      await page.screenshot({ path: testInfo.outputPath('tokyo-finish-controls.png') });
      await page.locator('#next-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'countdown');
      expect(errors).toEqual([]);
    });

    test('race again still responds after collisions and a completed Tokyo race', async ({ gameplayPage: page }) => {
      await collidedTokyoFinish(page);
      await page.locator('#again-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'countdown');
      await expect(page.locator('#race-overlay')).toBeHidden();
    });
  });
}
