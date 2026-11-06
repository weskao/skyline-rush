import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { selectLocale } from './helpers/locale-browser.js';

const key = 'skyline-rush-challenge-medals-v1';
const finish = async (page, collision = false) => {
  await page.evaluate(collision => {
    const race = window.gameplay.race;
    // Seed a distant scenario; the real simulation crosses the line and settles it.
    race.elapsed = 80;
    race.traffic = [];
    Object.assign(race.player, { distance: race.length - 2, speed: 60, collisions: collision ? 1 : 0, x: 2.5 });
  }, collision);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
  await expect(page.locator('#result-stats')).toBeVisible();
};

// The test visits both languages itself, and narrow portrait is the strictest overflow case.
for (const [name, viewport, hasTouch] of [
  ['portrait', { width: 390, height: 844 }, true],
]) for (const locale of ['en']) test.describe(`${name} ${locale} personal medals`, () => {
  test.use({ viewport, hasTouch, locale: locale === 'en' ? 'en-US' : 'zh-TW' });
  test('clean trial settles once, preserves Career and survives retry and language changes', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('button[data-race-mode="time"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await finish(page);
    const award = locale === 'en' ? 'Clean time trial' : '零碰撞計時';
    await expect(page.locator('#overlay-copy')).toContainText(award);
    await page.screenshot({ path: `${process.env.MEDAL_SHOT_DIR || 'test-results/personal-medals'}/${name}-${locale}-result.png` });
    const first = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).awards['time-clean'], key);
    await page.locator('#camera-button').click();
    const other = locale === 'en' ? 'zh-TW' : 'en';
    await selectLocale(page, other);
    await expect(page.locator('#overlay-copy')).toContainText(other === 'en' ? 'Clean time trial' : '零碰撞計時');
    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await finish(page);
    await expect(page.locator('#overlay-copy')).not.toContainText(other === 'en' ? 'Personal medals earned:' : '獲得個人勳章');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).awards['time-clean'], key)).toBe(first);
    await page.reload();
    await page.locator('.history-button').click();
    await page.locator('#challenge-medals').scrollIntoViewIfNeeded();
    await expect(page.locator('#challenge-medal-count')).toContainText('1 / 5');
    await expect(page.locator('[data-challenge-medal]')).toHaveCount(5);
    await expect(page.locator('[data-challenge-medal="time-clean"]')).toHaveClass(/is-awarded/);
    await expect(page.locator('#achievement-status')).toContainText('0');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${process.env.MEDAL_SHOT_DIR || 'test-results/personal-medals'}/${name}-${locale}-history.png` });
    await page.locator('#history-close').click();
    await selectLocale(page, locale);
    await page.locator('.history-button').click();
    await expect(page.locator('[data-challenge-medal="time-clean"] strong')).toHaveText(award);
    expect(errors).toEqual([]);
  });
});

test('a collided trial awards no clean medal', async ({ gameplayPage: page }) => {
  await page.locator('button[data-race-mode="time"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await finish(page, true);
  await expect(page.locator('#overlay-copy')).not.toContainText('Personal medals earned:');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"awards":{}}').awards, key)).toEqual({});
});


test('blocked medal storage retains session collection and exports a usable backup', async ({ gameplayPage: page }) => {
  await page.evaluate(key => {
    const save = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      if (name === key) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return save.call(this, name, value);
    };
  }, key);
  await page.locator('button[data-race-mode="time"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await finish(page);
  await expect(page.locator('#overlay-copy')).toContainText('Clean time trial');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await page.locator('#result-links [data-open-history]').click();
  await expect(page.locator('#challenge-medal-count')).toContainText('1 / 5');
  const downloading = page.waitForEvent('download');
  await page.locator('#cloud-export').click();
  const { readFile } = await import('node:fs/promises');
  const backup = JSON.parse(await readFile(await (await downloading).path(), 'utf8'));
  expect(Object.keys(backup.localChallengeMedals.awards)).toEqual(['time-clean']);
});
