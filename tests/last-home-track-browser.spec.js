import { clickLobbyOption } from './helpers/home-lobby.js';
import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { dailyChallenge } from '../src/game.js';

const selectedPlayable = page => page.locator('[data-track][aria-pressed="true"]').getAttribute('data-track');
const selectedUpcoming = page => page.locator('[data-upcoming-track][aria-pressed="true"]').getAttribute('data-upcoming-track');

test('returning to home after Daily preserves the saved picker course', async ({ gameplayPage: page }) => {
  const daily = dailyChallenge().track;
  const pick = daily === 'neon' ? 'canyon' : 'neon';
  await page.evaluate(ids => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids)), ['coast', 'neon', 'canyon']);
  await page.reload();
  await clickLobbyOption(page, `[data-track="${pick}"]`);
  await expect.poll(() => selectedPlayable(page)).toBe(pick);
  await page.locator('#daily-card-start').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.elapsed = 80;
    Object.assign(race.player, { distance: race.length - 10, speed: 60 });
  });
  await expect(page.locator('#choose-track')).toBeVisible();
  await page.locator('#choose-track').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect.poll(() => selectedPlayable(page)).toBe(pick);
  expect(await page.evaluate(() => ({
    local: localStorage.getItem('skyline-rush-last-track'),
    session: sessionStorage.getItem('skyline-rush-last-track'),
  }))).toEqual({ local: pick, session: null });
});

test('returning to home restores a Coming Soon card selected before Daily', async ({ gameplayPage: page }) => {
  await clickLobbyOption(page, '[data-upcoming-track="dune-tempest"]');
  await expect.poll(() => selectedUpcoming(page)).toBe('dune-tempest');
  await page.locator('#daily-card-start').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.elapsed = 80;
    Object.assign(race.player, { distance: race.length - 10, speed: 60 });
  });
  await expect(page.locator('#choose-track')).toBeVisible();
  await page.locator('#choose-track').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect.poll(() => selectedUpcoming(page)).toBe('dune-tempest');
});

for (const [selection, selector, viewport, startEnabled] of [
  ['neon', '[data-track="neon"]', { width: 1440, height: 900 }, true],
  ['neon', '[data-track="neon"]', { width: 390, height: 844 }, true],
  ['dune-tempest', '[data-upcoming-track="dune-tempest"]', { width: 844, height: 390 }, false],
  ['canyon', '[data-track="canyon"]', { width: 1440, height: 900 }, false],
]) {
  test(`reopening the game restores ${selection} at ${viewport.width}px`, async ({ page, context, baseURL }) => {
    await context.addInitScript(() => localStorage.setItem('skyline-rush-unlocked', '["coast","neon"]'));
    await page.setViewportSize(viewport);
    await page.goto('/');
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await clickLobbyOption(page, selector);
    await expect(page.locator('#intro')).toHaveAttribute('data-lobby-track', selection);
    await page.close();

    const reopened = await context.newPage();
    await reopened.setViewportSize(viewport);
    await reopened.goto(baseURL);
    await expect(reopened.locator('#intro')).toHaveAttribute('data-lobby-track', selection);
    await expect(reopened.locator(selector)).toHaveAttribute('aria-pressed', 'true');
    if (startEnabled) await expect(reopened.locator('#start-button')).toBeEnabled();
    else await expect(reopened.locator('#start-button')).toBeDisabled();
  });
}
