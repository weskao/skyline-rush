import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ciTimeout } from './helpers/ci.js';

// Real WebGL Frostbite Canyon RACE on the `make dev-unlocked` module alias (release builds keep the card Coming Soon).
// Set FROSTBITE_CAPTURE_DIR to keep the evidence frames.
const captureDir = process.env.FROSTBITE_CAPTURE_DIR;
const capture = async (page, name) => {
  if (!captureDir) return;
  mkdirSync(captureDir, { recursive: true });
  await page.screenshot({ path: join(captureDir, `${name}.png`) });
};
// Stops along the route: basin landmark, first hairpin, glacier shortcut, riverbed ice hairpin, Rift deck, climb, finish run-in.
const STOPS = [['sentinels', 900], ['hairpin-1', 1750], ['glacier-deck', 3300], ['hairpin-2', 5100], ['rift-deck', 6400], ['climb', 7600], ['outlet', 13300]];

test.use({ unlockedAccess: true });
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`Frostbite race ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('the Coming Soon card enters a real 13.8 km race that renders the course, finishes once and saves nothing', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-upcoming-track="frostbite-canyon"]').click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await expect(page.locator('#track-length')).toHaveText('13.8 KM SPRINT');
    await expect(page.locator('.route-heading')).toHaveText('FROSTBITE CANYON');
    await expect(page.locator('#upcoming-scene')).toBeHidden();
    await page.waitForTimeout(1200);
    const ready = await page.evaluate(() => {
      const course = window.gameScene.scene.getObjectByName('Frostbite Canyon race');
      return { trackId: window.gameplay.race.trackId, visible: course.visible, sentinels: !!course.getObjectByName('crystal-sentinels') };
    });
    expect(ready).toEqual({ trackId: 'frostbite-canyon', visible: true, sentinels: true });
    await capture(page, `${name}-ready`);

    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15_000) });
    const programs = await page.evaluate(() => window.gameScene.renderer.info.programs.length);
    for (const [stop, distance] of STOPS) {
      await page.evaluate(d => { Object.assign(window.gameplay.race.player, { distance: d, x: 0, speed: 60 }); }, distance);
      await page.waitForTimeout(700);
      // The player is drawn on the road frame (camera-relative origin at the car), not left at a classic centreline.
      const pose = await page.evaluate(() => window.gameScene.player.position.toArray());
      expect(Math.hypot(pose[0], pose[2]), `${stop} player near origin`).toBeLessThan(3);
      await capture(page, `${name}-${stop}`);
    }
    expect(await page.evaluate(() => window.gameScene.renderer.info.programs.length), 'no shader compiles mid-race').toBe(programs);

    await page.evaluate(() => { const race = window.gameplay.race; Object.assign(race.player, { distance: race.length - 5, speed: 60 }); });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished', { timeout: ciTimeout(15_000) });
    await expect(page.locator('#race-overlay')).toBeVisible({ timeout: ciTimeout(15_000) });
    await expect(page.locator('#next-button')).toBeHidden(); // a gated runtime unlocks nothing
    await capture(page, `${name}-finished`);
    const saved = await page.evaluate(() => ['skyline-rush-history', 'skyline-rush-best-tracks', 'skyline-rush-stars']
      .map(key => localStorage.getItem(key)));
    expect(saved).toEqual([null, null, null]);
    await page.locator('#again-button').click(); // a real click on the results screen restarts the same course
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(await page.evaluate(() => [window.gameplay.race.trackId, window.gameplay.race.player.distance < 50])).toEqual(['frostbite-canyon', true]);
    expect(errors).toEqual([]);
  });
});
