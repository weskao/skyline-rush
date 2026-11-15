import { test } from './helpers/gameplay-browser.js';
import { expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('skyline-rush-vfx')) {
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
    }
    localStorage.setItem('skyline-rush-music', 'off');
  });
});

for (const [name, viewport, hasTouch, angle, button, clicks] of [
  ['desktop', { width: 1440, height: 900 }, false, 'right', 'prev', 2],
  ['phone portrait', { width: 390, height: 844 }, true, 'front', 'next', 1],
  ['phone landscape', { width: 844, height: 390 }, true, 'orbit', 'prev', 1],
]) {
  test.describe(name, () => {
    test.use({ viewport, hasTouch });

    test(`Start cuts from the ${angle} showcase to the rear chase camera`, async ({ gameplayPage: page }, info) => {
      test.setTimeout(ciTimeout(65000));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const dock = page.locator('#showcase-camera-dock');
      for (let i = 0; i < clicks; i++) await page.locator(`#showcase-camera-${button}`).click();
      await expect(dock).toHaveAttribute('data-view', angle);

      // Sample rendered frames, so a later chase frame cannot hide a lingering showroom angle.
      await page.evaluate(() => {
        const { camera, composer, player } = window.gameScene;
        const render = composer.render.bind(composer);
        composer.render = (...args) => {
          const { x, z } = player.worldToLocal(camera.position.clone());
          const bearing = Math.atan2(x, z) * 180 / Math.PI;
          if (window.gameplay.race.phase === 'ready') window.homeCameraBearing = bearing;
          else window.firstRaceCameraBearing ??= bearing;
          return render(...args);
        };
      });
      await expect.poll(() => page.evaluate(() => Math.abs(window.homeCameraBearing))).toBeGreaterThan(65);
      await page.screenshot({ path: info.outputPath('home-camera.png') });
      await page.locator('#start-button').click();
      const firstRaceBearing = () => page.evaluate(() => window.firstRaceCameraBearing);
      await expect.poll(firstRaceBearing).toEqual(expect.any(Number));
      expect(Math.abs(await firstRaceBearing())).toBeLessThan(20);
      await page.screenshot({ path: info.outputPath('race-camera.png') });
      expect(errors).toEqual([]);
    });
  });
}

test('a fresh race resets its camera and Home restores its selection after leaving and reloading', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(65000));
  const dock = page.locator('#showcase-camera-dock');
  const raceCamera = page.locator('#camera-button');
  const start = page.locator('#start-button');
  const selector = page.locator('#showcase-camera-select');
  await selector.selectOption('orbit');
  await expect(dock).toHaveAttribute('data-view', 'orbit');
  await start.click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  await raceCamera.click();
  await expect(raceCamera).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.brand').click();
  await page.locator('#leave-end').click();
  await expect(dock).toBeVisible();
  await expect(dock).toHaveAttribute('data-view', 'orbit');
  await start.click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  await expect(raceCamera).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(dock).toBeVisible();
  await expect(dock).toHaveAttribute('data-view', 'orbit');
  await expect(selector).toHaveValue('orbit');
});
