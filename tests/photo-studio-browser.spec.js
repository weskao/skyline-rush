import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { RACE_TRACKS } from '../src/game.js';

const tracks = Object.keys(RACE_TRACKS);
// Observable racing UI, including the diagnostic strip mounted outside the Vue app.
const backgroundUI = [
  '.telemetry', '#driving-message', '.topbar', '.aero-tools', '#performance-notice',
  '#race-info', '#race-overlay', '#touch-controls', '.scene-shade', '.bottomline',
  '.speed-streaks', '.flight-director', '.altitude-ladder', '#airflow-hud',
  '#event-callout', '#impact-report', '#perf-overlay',
];
const layouts = [
  ['desktop', { width: 1440, height: 900 }, false, 'en-US', tracks],
  ['phone', { width: 390, height: 844 }, true, 'zh-TW', tracks],
  ['small-phone', { width: 320, height: 740 }, true, 'zh-TW', ['coast']],
  ['landscape', { width: 844, height: 390 }, true, 'en-US', ['coast']],
];

for (const [name, viewport, hasTouch, locale, trackIds] of layouts) {
  test.describe(`Photo Studio ${name}`, () => {
    test.use({ viewport, hasTouch, locale, deviceScaleFactor: 1 });
    for (const trackId of trackIds) {
      test(`${trackId}: clean preview restores paused UI and driving`, async ({ gameplayPage: page, gameplayURL }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(ids => {
          localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
          localStorage.setItem('skyline-rush-music', 'off');
        }, tracks);
        await page.addLocatorHandler(page.locator('#music-prompt'), () => page.locator('#music-no').click());
        await page.goto(`${gameplayURL}?perf`);
        await page.locator(`[data-track="${trackId}"]`).click();
        await page.locator('[data-race-mode="free"]').click();
        await page.locator('#start-button').click();
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
        await page.keyboard.down('ArrowUp');
        await expect.poll(() => page.evaluate(() => window.gameplay.race.player.distance)).toBeGreaterThan(1);
        await page.keyboard.up('ArrowUp');
        await expect(page.locator('#perf-overlay')).toContainText('FRAME');
        await page.locator('#pause-button').click();
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
        const paused = await page.evaluate(() => ({
          elapsed: window.gameplay.race.elapsed,
          distance: window.gameplay.race.player.distance,
        }));
        const visibility = await Promise.all(backgroundUI.map(selector => page.locator(selector).isVisible()));
        await page.locator('#photo-open').click();
        await expect(page.locator('#photo-screen')).toBeVisible();
        await expect(page.locator('#world')).toBeVisible();
        await page.screenshot({ path: `test-results/race-mode-photo-${name}-${trackId}.png` });
        for (const selector of backgroundUI) await expect(page.locator(selector), `${selector} must not overlay the photo`).toBeHidden();
        expect(await page.evaluate(() => ({
          elapsed: window.gameplay.race.elapsed,
          distance: window.gameplay.race.player.distance,
        }))).toEqual(paused);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
        await page.locator('#photo-save').scrollIntoViewIfNeeded();
        await expect(page.locator('#photo-save')).toBeInViewport();
        await page.locator('#photo-close').click();
        await expect(page.locator('#photo-screen')).toBeHidden();
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
        expect(await Promise.all(backgroundUI.map(selector => page.locator(selector).isVisible()))).toEqual(visibility);
        // Native Escape closes only the photo modal; it must not resume the race.
        await page.locator('#photo-open').click();
        await page.keyboard.press('Escape');
        await expect(page.locator('#photo-screen')).toBeHidden();
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
        await page.locator('#resume-button').click();
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
        await page.keyboard.down('ArrowUp');
        await expect.poll(() => page.evaluate(() => window.gameplay.race.player.distance)).toBeGreaterThan(paused.distance + 1);
        await page.keyboard.up('ArrowUp');
        await page.locator('#pause-button').click();
        await expect(page.locator('#photo-open')).toBeVisible();
        expect(errors).toEqual([]);
      });
    }
  });
}
