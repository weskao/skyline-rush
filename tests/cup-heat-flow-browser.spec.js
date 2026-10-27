import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { selectLocale } from './helpers/locale-browser.js';

const key = 'skyline-rush-cup-progress-v1';
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`Cup heat flow ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('finish, retry, next heat, quit and recovery preserve exactly one result per heat', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon'])));
    await page.reload();
    await page.locator('[data-race-mode="cup"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    const finish = async () => {
      await page.evaluate(() => {
        const race = window.gameplay.race;
        race.elapsed = 80;
        Object.assign(race.player, { distance: race.length - 10, speed: 60 });
      });
      await expect(page.locator('#race-overlay')).toBeVisible();
    };
    await finish();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).cup.results.length, key)).toBe(1);
    // Global restart retries the finished heat; it must remove the old points before racing again.
    await page.locator('#restart-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).cup.results.length, key)).toBe(0);
    await finish();
    await page.locator('#next-stage').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await expect(page.locator('#sprint-stage')).toHaveText('CUP HEAT 2 / 3');
    await finish();
    await selectLocale(page, 'zh-TW');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).cup.results.length, key)).toBe(2);
    await page.screenshot({ path: `artifacts/cup-recovery/${name}-standings.png` });
    await page.locator('#choose-track').click();
    await page.locator('#cup-rules > summary').click();
    await page.locator('#cup-resume').click();
    await expect(page.locator('#sprint-stage')).toHaveText('錦標賽第 3 / 3 站');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await finish();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).toBeNull();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-mode-history-v1')).length)).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('skyline-rush-stars'))).toBeNull();
    expect(errors).toEqual([]);
  });
});

test('a saved Cup becomes available after Classic unlocks its last required course', async ({ gameplayPage: page }) => {
  await page.evaluate(key => {
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon']));
    localStorage.setItem(key, JSON.stringify({ version: 1, cup: { tracks: ['coast', 'neon', 'canyon'], results: [] } }));
  }, key);
  await page.reload();
  await page.locator('[data-race-mode="cup"]').click();
  await page.locator('#cup-rules > summary').click();
  await expect(page.locator('#cup-recovery')).toHaveCount(0);
  await page.locator('[data-race-mode="classic"]').click();
  await page.locator('[data-track="neon"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.elapsed = 80;
    Object.assign(race.player, { distance: race.length - 10, speed: 60 });
    race.rivals.forEach(rival => { rival.finishTime = null; rival.distance = 0; });
  });
  await expect(page.locator('#race-overlay')).toBeVisible();
  await page.locator('#choose-track').click();
  await page.locator('[data-race-mode="cup"]').click();
  await expect(page.locator('#cup-resume')).toBeVisible();
});
