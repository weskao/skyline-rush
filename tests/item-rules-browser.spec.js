import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { selectLocale } from './helpers/locale-browser.js';

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`item rules ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('collecting a mystery ring exposes a usable held item, activation and cooldown', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-race-mode="free"]').click();
    await page.locator('#race-mode-rules > summary').click();
    const select = page.locator('[data-race-rule="itemRules"]');
    await expect(select).toHaveCount(1);
    await select.evaluate(node => { node.value = 'active'; node.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.locator('#start-button').click();
    await expect(page.locator('#item-status')).toContainText('EMPTY');
    await page.evaluate(() => {
      const race = window.gameplay.race;
      const ring = race.rings.find(ring => ring.type === 'mystery');
      Object.assign(race.player, { distance: ring.distance - .1, x: ring.x, altitude: ring.altitude, verticalSpeed: 0, speed: 50 });
    });
    await expect(page.locator('#activate-item')).toBeEnabled();
    await expect(page.locator('#item-status')).toContainText('READY');
    await expect(page.locator('#item-icon svg:visible')).toHaveCount(1);
    if (hasTouch) await page.locator('#activate-item').tap();
    else await page.keyboard.press('q');
    await expect(page.locator('#activate-item')).toBeDisabled();
    await expect(page.locator('#item-status')).toContainText(/ACTIVE|COOLDOWN/);
    expect(await page.evaluate(() => window.gameplay.race.player.heldItem)).toBeNull();
    await page.screenshot({ path: `artifacts/item-rules/${name}-active.png` });
    await page.locator('#pause-button').click();
    await selectLocale(page, 'zh-TW');
    await expect(page.locator('#item-status')).not.toContainText('ACTIVE');
    expect(errors).toEqual([]);
  });
});

test('Off removes every reward source; presets and recent configurations restore the selected rule', async ({ gameplayPage: page }) => {
  await page.locator('[data-race-mode="custom"]').click();
  await page.locator('#race-mode-rules > summary').click();
  const choose = rule => page.locator('[data-race-rule="itemRules"]').evaluate((node, rule) => {
    node.value = rule; node.dispatchEvent(new Event('change', { bubbles: true }));
  }, rule);
  await choose('off');
  expect(await page.evaluate(() => [window.gameplay.race.pickups.length, window.gameplay.race.rings.length])).toEqual([0, 0]);
  await choose('all');
  await page.locator('#start-button').click();
  await page.reload();
  await page.locator('[data-race-mode="custom"]').click();
  await page.locator('#race-mode-rules > summary').click();
  await choose('active');
  await page.locator('#recent-custom > summary').click();
  await page.locator('#recent-custom-runs button').first().click();
  await expect(page.locator('[data-race-rule="itemRules"]')).toHaveValue('all');
  await page.locator('[data-race-preset="noitems"]').click();
  await expect(page.locator('[data-race-rule="itemRules"]')).toHaveValue('off');
  expect(await page.evaluate(() => window.gameplay.race.rings.length)).toBe(0);
  await page.locator('[data-race-preset="standard"]').click();
  await expect(page.locator('[data-race-rule="itemRules"]')).toHaveValue('classic');
  expect(await page.evaluate(() => window.gameplay.race.config.itemRules)).toBeUndefined();
  expect(await page.evaluate(() => window.gameplay.race.config.activeItems)).toBeUndefined();
});

test('opening an older recent setup clears a previously restored active rule', async ({ gameplayPage: page }) => {
  await page.evaluate(() => localStorage.setItem('skyline-rush-recent-custom-v1', JSON.stringify([
    { trackId: 'coast', config: { mode: 'custom', itemRules: 'all', items: true, activeItems: true } },
    { trackId: 'coast', config: { mode: 'custom', items: true } },
  ])));
  await page.reload();
  await page.locator('[data-race-mode="custom"]').click();
  await page.locator('#recent-custom > summary').click();
  await page.locator('#recent-custom-runs button').nth(0).click();
  expect(await page.evaluate(() => window.gameplay.race.config.activeItems)).toBe(true);
  await page.locator('#recent-custom-runs button').nth(1).click();
  expect(await page.evaluate(() => window.gameplay.race.config.activeItems)).toBeUndefined();
  expect(await page.evaluate(() => window.gameplay.race.config.itemRules)).toBeUndefined();
});
