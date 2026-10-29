import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { selectLocale } from './helpers/locale-browser.js';

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`bonus gates ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('All items draw warned distinct gates and a real EMP pickup activates safely', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('button[data-race-mode="custom"]').click();
    await page.locator('#race-mode-rules > summary').click();
    await page.locator('[data-race-rule="itemRules"]').evaluate(node => {
      node.value = 'all'; node.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    const before = await page.evaluate(() => window.gameScene.renderer.info.programs.length);
    await page.evaluate(() => {
      const race = window.gameplay.race, gate = race.rings.find(ring => ring.type === 'speed-pad');
      race.player.distance = gate.distance - 120;
    });
    await expect(page.locator('#bonus-status')).toContainText('SPEED');
    await page.evaluate(() => {
      const race = window.gameplay.race, gate = race.rings.find(ring => ring.type === 'emp');
      Object.assign(race.player, { distance: gate.distance - .1, speed: 50, x: gate.x, altitude: gate.altitude });
    });
    await expect(page.locator('#item-status')).toContainText('EMP');
    await expect(page.locator('#activate-item')).toBeEnabled();
    if (hasTouch) await page.locator('#activate-item').tap();
    else await page.keyboard.press('q');
    await expect(page.locator('#item-icon .item-emp')).toBeVisible();
    await page.screenshot({ path: `artifacts/item-rules/${name}-emp.png` });
    expect(await page.evaluate(() => window.gameScene.renderer.info.programs.length)).toBe(before);
    await page.locator('#pause-button').click();
    await selectLocale(page, 'zh-TW');
    await expect(page.locator('#bonus-status')).not.toContainText('NEXT');
    expect(errors).toEqual([]);
  });
});

test('Stunt and Checkpoint bonus gates are explicit opt-ins and keep ordinary sessions unchanged', async ({ gameplayPage: page }) => {
  for (const mode of ['stunt', 'checkpoint']) {
    await page.locator(`button[data-race-mode="${mode}"]`).click();
    await expect(page.locator('#bonus-gates-rule')).toBeVisible();
    await page.locator('[data-race-rule="bonusGates"]').check();
    expect(await page.evaluate(() => window.gameplay.race.rings.some(ring => ring.type === 'score-pad'))).toBe(true);
    await page.locator('[data-race-rule="bonusGates"]').uncheck();
    expect(await page.evaluate(() => window.gameplay.race.config.bonusGates)).toBeUndefined();
  }
});
