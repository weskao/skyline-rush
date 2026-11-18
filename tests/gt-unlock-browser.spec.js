import { expect } from '@playwright/test';
import { test, captureHooks, dressedAs } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { openGarageSection } from './helpers/garage-browser.js';

const gt = page => page.locator('#garage-screen [data-car="crimson-gt"]');
const stars = { coast: 3, neon: 3, canyon: 3, aurora: 3, spiral: 3, taipei: 2 };
async function enter(page, url, { career = stars, startedAt, garage = true } = {}) {
  await captureHooks(page);
  await page.addInitScript(({ career, startedAt }) => {
    for (const [setting, value] of Object.entries({ 'guide-seen': '1', 'tutorial-completed': '1', 'whats-new-seen-v1': '999.0.0', music: 'off' }))
      localStorage.setItem('skyline-rush-' + setting, value);
    localStorage.setItem('skyline-rush-stars', JSON.stringify(career));
    if (startedAt) localStorage.setItem('skyline-rush-gt-trial-started-at', JSON.stringify(startedAt));
  }, { career, startedAt });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  if (garage) {
    await page.locator('#garage-button').click();
    await openGarageSection(page, 'cars');
  }
}

test('the GT stays locked at 17 stars until explicit trial activation', async ({ page, gameplayURL }) => {
  await enter(page, gameplayURL);
  await expect(gt(page)).toHaveAttribute('data-car-access', 'locked');
  await expect(page.getByText('17 / 18 Career stars')).toBeVisible();
  await gt(page).click();
  await expect.poll(() => dressedAs(page), { timeout: ciTimeout(20_000) }).toBe('crimson-gt');
  await expect(gt(page)).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('skyline-rush-car'))).toBeNull();
  await page.getByRole('button', { name: 'Start 24-hour test drive' }).click();
  await expect(gt(page)).toHaveAttribute('data-car-access', 'trial');
  await expect(gt(page)).toHaveAttribute('aria-pressed', 'true');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => dressedAs(page), { timeout: ciTimeout(20_000) }).toBe('crimson-gt');
});

test('18 Career stars allow the earned GT after the trial has expired', async ({ page, gameplayURL }) => {
  await enter(page, gameplayURL, { career: { ...stars, taipei: 3 }, startedAt: Date.now() - 172_800_000 });
  await expect(gt(page)).toHaveAttribute('data-car-access', 'owned');
  await gt(page).click();
  await expect(gt(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Start 24-hour test drive' })).toHaveCount(0);
});

test('the 18th Career star in results opens the Garage with the GT owned', async ({ page, gameplayURL }) => {
  await enter(page, gameplayURL, { career: { ...stars, coast: 2, taipei: 3 }, garage: false });
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.elapsed = 60;
    Object.assign(race.player, { distance: race.length - 10, speed: 60, score: race.length });
  });
  await expect(page.locator('#overlay-copy')).toContainText('Vantaire GT unlocked!');
  await page.getByRole('button', { name: 'Go to Garage' }).click();
  await expect(page.locator('#garage-screen')).toBeVisible();
  await openGarageSection(page, 'cars');
  await expect(gt(page)).toHaveAttribute('data-car-access', 'owned');
});
