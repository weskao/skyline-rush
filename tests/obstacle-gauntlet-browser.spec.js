import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { selectLocale } from './helpers/locale-browser.js';
import { mkdir } from 'node:fs/promises';

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) for (const locale of ['en', 'zh-TW']) test.describe(`Mixed Obstacle Gauntlet ${name} ${locale}`, () => {
  test.use({ viewport, hasTouch });
  test('the course selector races gates, debris and hoops; Barriers keeps the original course', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await selectLocale(page, locale);
    await page.locator('button[data-race-mode="gauntlet"]').click();
    await page.locator('#gauntlet-rules > summary').click();
    const layout = page.locator('#gauntlet-layout');
    await expect(layout).toHaveValue('classic');
    expect(await page.evaluate(() => window.gameplay.race.hazards.every(h => !h.placement))).toBe(true);
    await layout.evaluate(select => { select.value = 'mixed'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await expect.poll(() => page.evaluate(() => window.gameplay.race.config.layout)).toBe('mixed');
    const kinds = await page.evaluate(() => [...new Set(window.gameplay.race.hazards.map(h => h.type))].sort());
    expect(kinds).toEqual(['barrier', 'debris', 'gate']);
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    await mkdir('artifacts/obstacle-gauntlet', { recursive: true });
    for (const type of ['gate', 'debris', 'barrier']) {
      await page.evaluate(kind => {
        const race = window.gameplay.race, hazard = race.hazards.find(h => h.type === kind);
        Object.assign(race.player, { distance: hazard.distance - 45, speed: 0, x: hazard.x > 0 ? -7.5 : 7.5 });
      }, type);
      await expect.poll(() => page.evaluate(() => window.gameScene.scene.getObjectByName('gauntlet-barriers').count)).toBeGreaterThan(0);
      await page.screenshot({ path: `artifacts/obstacle-gauntlet/${name}-${locale}-${type}.png` });
    }
    expect(errors).toEqual([]);
  });
});
