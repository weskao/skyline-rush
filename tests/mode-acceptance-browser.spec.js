import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// Roadmap 9B / 9C / 9D acceptance through real controls, desktop and phone.
const CLASSIC_KEYS = ['skyline-rush-best-tracks', 'skyline-rush-best', 'skyline-rush-daily', 'skyline-rush-ghosts', 'skyline-rush-history',
  'skyline-rush-medals', 'skyline-rush-stars', 'skyline-rush-unlocked'];
const classicStorage = page => page.evaluate(keys => keys.map(key => localStorage.getItem(key)), CLASSIC_KEYS);
const pickMode = async (page, mode) => {
  await page.locator(`button[data-race-mode="${mode}"]`).click();
  await expect(page.locator('body')).toHaveAttribute('data-race-mode', mode);
};
const teleportToFinish = page => page.evaluate(() => {
  const race = window.gameplay.race;
  race.elapsed = Math.max(race.elapsed, 80);
  Object.assign(race.player, { distance: race.length - 10, speed: 60 });
});
const inViewport = async (page, selector) => {
  const box = await page.locator(selector).boundingBox();
  const { width, height } = page.viewportSize();
  expect(box, selector).not.toBeNull();
  expect(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, `${selector} on screen`).toBe(true);
};

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`mode acceptance ${name}`, () => {
  test.use({ viewport, hasTouch });

  test('9B: Free Drive pauses, resumes, restarts and exits with this device\'s controls', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await pickMode(page, 'free');
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    const pause = () => hasTouch ? page.locator('#pause-button').tap() : page.keyboard.press('KeyP');
    await pause();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
    await (hasTouch ? page.locator('#resume-button').tap() : page.keyboard.press('KeyP'));
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await page.evaluate(() => { window.firstRace = window.gameplay.race; window.gameplay.race.player.distance = 900; });
    if (hasTouch) { await pause(); await page.locator('#again-button').tap(); } else await page.keyboard.press('Backspace');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    expect(await page.evaluate(() => window.gameplay.race !== window.firstRace && window.gameplay.race.mode === 'free' &&
      window.gameplay.race.player.distance < 900)).toBe(true);
    await page.locator('.brand').click();
    await page.locator('#leave-end').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await expect(page.locator('#intro')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('9B: reaching the road end finishes Free Drive, saves nothing and Race Again starts a new run', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const before = await classicStorage(page);
    await pickMode(page, 'free');
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await teleportToFinish(page);
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
    await expect(page.locator('#race-overlay')).toBeVisible();
    await expect(page.locator('#new-best')).toBeHidden();
    expect(await classicStorage(page)).toEqual(before);
    await page.evaluate(() => { window.firstRace = window.gameplay.race; });
    await (hasTouch ? page.locator('#again-button').tap() : page.locator('#again-button').click());
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    expect(await page.evaluate(() => window.gameplay.race !== window.firstRace && window.gameplay.race.mode === 'free')).toBe(true);
    expect(errors).toEqual([]);
  });

  test('9B: repeated Free Drive sessions do not grow GPU buffers', async ({ gameplayPage: page }) => {
    const session = async () => {
      await pickMode(page, 'free');
      await page.locator('#start-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
      await page.evaluate(() => { window.gameplay.race.player.distance = 1500; });
      await page.waitForTimeout(400);
      await page.locator('.brand').click();
      await page.locator('#leave-end').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
      return page.evaluate(() => ({ ...window.gameScene.renderer.info.memory }));
    };
    await session();
    const settled = await session();
    for (let i = 0; i < 3; i++) await session();
    expect(await session()).toEqual(settled);
  });

  test('9C: a Custom race with 0 rivals finishes to a solo result without touching Classic records', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const before = await classicStorage(page);
    await pickMode(page, 'custom');
    await page.locator('[data-race-rule="rivals"]').evaluate(select => {
      select.value = '0';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    expect(await page.evaluate(() => window.gameplay.race.rivals.length)).toBe(0);
    await expect(page.locator('#leaderboard .racer')).toHaveCount(1);
    await teleportToFinish(page);
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
    await expect(page.locator('#race-overlay')).toBeVisible();
    await expect(page.locator('#again-button')).toBeVisible();
    expect(await page.evaluate(() => window.gameplay.race.result.position)).toBe(1);
    expect(await classicStorage(page)).toEqual(before);
    await page.screenshot({ path: `test-results/mode-acceptance-custom-solo-${name}.png` });
    expect(errors).toEqual([]);
  });

  test('9D: Time Attack plays to its result with storage blocked and a readable HUD', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      for (const method of ['getItem', 'setItem', 'removeItem'])
        Storage.prototype[method] = () => { throw new DOMException('blocked', 'SecurityError'); };
    });
    await page.reload(); // blocked from the first script on, as in a locked-down browser
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await pickMode(page, 'time');
    await page.locator('#start-button').click();
    // With storage blocked the guide's seen flag cannot be read, so the first Start of a page load runs the guided
    // practice and Skip continues straight into the chosen race (main.js start/beginTutorial). Play is never blocked.
    await expect(page.locator('body')).toHaveAttribute('data-tutorial', 'active');
    await page.locator('#tutorial-exit').click();
    await expect(page.locator('body')).toHaveAttribute('data-race-mode', 'time');
    await expect(page.locator('#race-status')).toHaveText('RACING');
    for (const selector of ['#race-info', '.position-stat', '#race-status']) await inViewport(page, selector);
    await page.screenshot({ path: `test-results/mode-acceptance-time-hud-${name}.png` });
    await teleportToFinish(page);
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
    await expect(page.locator('#race-overlay')).toBeVisible();
    await expect(page.locator('#again-button')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
