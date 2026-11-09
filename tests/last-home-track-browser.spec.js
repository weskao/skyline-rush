import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { dailyChallenge } from '../src/game.js';

const selectedPlayable = page => page.locator('[data-track][aria-pressed="true"]').getAttribute('data-track');
const selectedUpcoming = page => page.locator('[data-upcoming-track][aria-pressed="true"]').getAttribute('data-upcoming-track');

test('returning to home keeps the last picker course in memory after Daily, and never writes storage', async ({ gameplayPage: page }) => {
  const daily = dailyChallenge().track;
  const pick = daily === 'neon' ? 'canyon' : 'neon';
  await page.evaluate(ids => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids)), ['coast', 'neon', 'canyon']);
  await page.reload();
  await page.locator(`[data-track="${pick}"]`).click();
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
  }))).toEqual({ local: null, session: null });
});

test('returning to home restores a Coming Soon card selected before Daily', async ({ gameplayPage: page }) => {
  await page.locator('[data-upcoming-track="dune-tempest"]').click();
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
