import { expect } from '@playwright/test';
import { captureHooks, test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { CLASSIC_IDS } from './helpers/traffic-browser.js';
import { COURSE_TRACKS } from '../src/race-tracks.ts';

// Every map, Coming Soon courses included (dev-unlocked runtimes), shows the same slim strip at halfway.
test.use({ unlockedAccess: true, viewport: { width: 960, height: 600 } });
for (const id of [...CLASSIC_IDS, ...Object.keys(COURSE_TRACKS)]) {
  test(`${id} shows the slim halfway strip`, async ({ page, gameplayURL }) => {
    test.setTimeout(ciTimeout(60_000));
    await captureHooks(page);
    await page.addInitScript(ids => {
      if (!location.origin.startsWith('http://')) return;
      for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['locale', 'zh-TW']]) localStorage.setItem(`skyline-rush-${key}`, value);
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
    }, CLASSIC_IDS);
    await page.goto(gameplayURL, { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    await page.locator(`[data-track="${id}"], [data-upcoming-track="${id}"]`).click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await page.locator('#start-button').click();
    await page.evaluate(() => { window.gameplay.race.countdown = .01; });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(30_000) });
    await page.evaluate(async () => {
      const { groundAt } = await import('/src/course-items.ts');
      const { placeCourseCar } = await import('/src/course-race.ts');
      const { race } = window.gameplay;
      race.traffic.length = 0;
      race.player.distance = race.length / 2 + 1;
      if (race.course) {
        const { edgeId, localS } = groundAt(race.course.spec.graph, race.player.distance);
        placeCourseCar(race.course, 'YOU', edgeId, localS, race.player);
      }
    });
    const card = page.locator('#race-halfway-card');
    await expect(card).toBeVisible({ timeout: ciTimeout(10_000) });
    await expect(card).toContainText('賽事過半');
    const fit = await card.evaluate(node => {
      const scene = document.querySelector('#world').getBoundingClientRect(), box = node.getBoundingClientRect();
      return { dx: box.x + box.width / 2 - scene.x - scene.width / 2, height: box.height / scene.height,
        area: box.width * box.height / (scene.width * scene.height) };
    });
    expect(Math.abs(fit.dx)).toBeLessThan(2);
    expect(fit.height).toBeLessThan(.1);
    expect(fit.area).toBeLessThan(.04);
  });
}
