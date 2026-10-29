import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { saveArtifact } from './helpers/artifact.js';
import { ciTimeout } from './helpers/ci.js';

// 11B visual check: every themed track draws its first hazards in the real WebGL scene where the
// simulation places them. Themes have no menu toggle yet (10A), so the test loads the same
// themedHazards() a `themes: true` race would get.
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`themed hazards ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('every themed track draws its hazards on the road ahead', async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(180_000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ids = await page.evaluate(() => import('/src/track-themes.ts').then(m => [...m.THEMED_TRACKS]));
    expect(ids.length).toBeGreaterThanOrEqual(10);
    await page.evaluate(list => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(list)), ids);
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    for (const id of ids) {
      await page.locator(`[data-track="${id}"]`).click();
      await page.locator('#start-button').click();
      await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15_000) });
      await expect(page.locator('#countdown')).toBeHidden({ timeout: ciTimeout(10_000) });
      const first = await page.evaluate(async trackId => {
        const { themedHazards } = await import('/src/track-themes.ts');
        const race = window.gameplay.race, hazards = themedHazards(trackId);
        race.traffic = []; race.pickups = []; race.rings = [];
        race.hazards = hazards;
        const target = hazards[0];
        const free = [-7.5, -2.5, 2.5, 7.5].find(lane => Math.abs(lane - target.x) > 5);
        Object.assign(race.player, { distance: target.distance - 45, x: free, speed: 0, altitude: 0 });
        // Hold the car 45 m short of the hazard so the frame shows it ahead.
        const pin = () => { if (race.phase !== 'racing') return; Object.assign(race.player, { distance: target.distance - 45, x: free, speed: 0 }); requestAnimationFrame(pin); };
        pin();
        return { id: target.id, type: target.type };
      }, id);
      const drawn = () => page.evaluate(() => {
        const mesh = window.gameScene.scene.getObjectByName('gauntlet-barriers');
        return mesh?.visible ? mesh.count : 0;
      });
      await expect.poll(drawn, { message: `${id} ${first.id}` }).toBeGreaterThan(0);
      await saveArtifact(page, { path: `artifacts/track-themes/${name}-${id}.jpeg`, quality: 70 });
      await page.keyboard.press('Escape');
      await page.reload();
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    }
    expect(errors).toEqual([]);
  });
});
