import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';

// 10C: after a finish, pausing, switching language, restarting, exiting and switching mode never write or award it again.
const writes = page => page.evaluate(() => ({ ...window.storageWrites }));
async function finish(page, mode) {
  await page.evaluate(mode => {
    const race = window.gameplay.race;
    // Seed a distant scenario; the real simulation crosses the line (or takes the fifth Endless hit) and settles it.
    race.elapsed = mode === 'stunt' ? 119.95 : 80;
    race.traffic = [];
    Object.assign(race.player, { distance: race.length - (mode === 'stunt' ? 100 : 2), speed: 60, x: 2.5, collisions: mode === 'endless' ? 5 : 0 });
    if (race.checkpoint) {
      race.checkpoint.passed = race.checkpoint.gates.length;
      race.checkpoint.missed = 0;
      race.checkpoint.gates.forEach(gate => { gate.passed = true; gate.missed = false; });
    }
    if (mode === 'gauntlet') race.hazards.forEach(hazard => { hazard.passed = true; hazard.hit = false; });
  }, mode);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
  await expect(page.locator('#result-stats')).toBeVisible();
}

test.use({ viewport: { width: 1440, height: 900 } });
// Circuit needs real driven laps (a teleport never counts one); tests/race-results.test.js covers its settle-once per mode.
for (const mode of ['classic', 'time', 'gauntlet', 'checkpoint', 'stunt', 'custom', 'elimination', 'endless']) {
  test(`${mode}: one finish writes its result once, whatever follows`, async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => {
      window.storageWrites = {};
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        window.storageWrites[key] = (window.storageWrites[key] ?? 0) + 1;
        return setItem.call(this, key, value);
      };
    });
    if (mode !== 'classic') await page.locator(`button[data-race-mode="${mode}"]`).click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
    const before = await writes(page);
    await finish(page, mode);
    const settled = await writes(page);
    const resultKeys = Object.keys(settled).filter(key => settled[key] !== before[key]);
    expect(resultKeys.length, 'the finish wrote its result').toBeGreaterThan(0);
    const history = await page.evaluate(() => localStorage.getItem('skyline-rush-history'));
    const unchanged = async event => {
      const now = await writes(page);
      expect(Object.fromEntries(resultKeys.map(key => [key, now[key]])), `${mode} after ${event}`)
        .toEqual(Object.fromEntries(resultKeys.map(key => [key, settled[key]])));
      expect(await page.evaluate(() => localStorage.getItem('skyline-rush-history')), `${mode} history after ${event}`).toBe(history);
    };
    for (const key of ['Escape', 'KeyP']) await page.keyboard.press(key);
    await unchanged('pause keys');
    await selectLocale(page, 'zh-TW');
    await selectLocale(page, 'en');
    await page.locator('#camera-button').click();
    await unchanged('language and camera menus');
    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    await page.keyboard.press('Backspace');
    await unchanged('race again and restart');
    await page.locator('.brand').click();
    if (await page.locator('#leave-screen').isVisible()) await page.locator('#leave-end').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await page.locator(`button[data-race-mode="${mode === 'custom' ? 'time' : 'custom'}"]`).click();
    await unchanged('exit and mode switch');
    expect(errors).toEqual([]);
  });
}
