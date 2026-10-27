import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { selectLocale } from './helpers/locale-browser.js';
import { mkdir } from 'node:fs/promises';

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) for (const locale of ['en', 'zh-TW']) test.describe(`Event Lab ${name} ${locale}`, () => {
  test.use({ viewport, hasTouch });
  test('edit import export launch and retry retain the real authored stage', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await selectLocale(page, locale);
    await page.locator('[data-race-mode="eventlab"]').click();
    const dialog = page.locator('#event-lab-dialog');
    await expect(dialog).toBeVisible();
    await page.locator('.lab-share > summary').click();
    await page.locator('#lab-json').fill('{broken');
    await page.locator('#lab-import').click();
    await expect(page.locator('#lab-error')).not.toBeEmpty();
    await page.locator('#lab-export').click();
    const document = JSON.parse(await page.locator('#lab-json').inputValue());
    expect(document.version).toBe(1);
    const lane = page.locator('[data-lab-lane]').first();
    const before = await lane.inputValue();
    await lane.fill(before === '0' ? '1' : '0');
    await lane.press('Tab');
    await page.locator('#lab-undo').click();
    await expect(lane).toHaveValue(before);
    await page.locator('#lab-redo').click();
    await expect(lane).not.toHaveValue(before);
    await page.locator('#lab-reset').click();
    await page.locator('#lab-export').click();
    const authored = JSON.parse(await page.locator('#lab-json').inputValue());
    await mkdir('artifacts/event-lab', { recursive: true });
    await page.screenshot({ path: `artifacts/event-lab/${name}-${locale}-editor.png` });
    await page.locator('#lab-use').click();
    await expect(dialog).toBeHidden();
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText(locale === 'en' ? 'RACING' : '比賽中');
    const identity = await page.evaluate(() => window.gameplay.race.config.course);
    expect(JSON.parse(identity)).toEqual(authored);
    await page.evaluate(() => {
      const race = window.gameplay.race, object = race.hazards[0];
      Object.assign(race.player, { distance: object.distance - 50, speed: 0, x: object.x });
    });
    await expect.poll(() => page.evaluate(() => window.gameScene.scene.getObjectByName('gauntlet-barriers').count)).toBeGreaterThan(0);
    await page.screenshot({ path: `artifacts/event-lab/${name}-${locale}-play.png` });
    await page.evaluate(() => {
      const race = window.gameplay.race;
      race.elapsed = 90;
      Object.assign(race.player, { distance: race.length - 3, speed: 60 });
    });
    await expect(page.locator('#race-overlay')).toBeVisible();
    await page.screenshot({ path: `artifacts/event-lab/${name}-${locale}-result.png` });
    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(await page.evaluate(() => window.gameplay.race.config.course)).toBe(identity);
    expect(await page.evaluate(() => window.gameplay.race.hazards.every(h => !h.hit && !h.passed))).toBe(true);
    await page.locator('#camera-button').click();
    await page.locator('#pause-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
    await selectLocale(page, locale === 'en' ? 'zh-TW' : 'en');
    expect(errors).toEqual([]);
  });
});
