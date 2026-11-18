import { expect } from '@playwright/test';
import { test, captureHooks } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { openGarageSection } from './helpers/garage-browser.js';

test.use({ keepAcquisitionOpen: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

const gt = page => page.locator('#garage-screen [data-car="crimson-gt"]');
const stars = { coast: 3, neon: 3, canyon: 3, aurora: 3, spiral: 3, taipei: 2 };
async function openCars(page) {
  await page.locator('#garage-button').click();
  await openGarageSection(page, 'cars');
}

async function enter(page, url, { career = stars, startedAt, garage = true } = {}) {
  await captureHooks(page);
  await page.addInitScript(({ career, startedAt }) => {
    for (const [setting, value] of Object.entries({ 'guide-seen': '1', 'tutorial-completed': '1', 'whats-new-seen-v1': '999.0.0', music: 'off', sound: 'off' }))
      localStorage.setItem('skyline-rush-' + setting, value);
    localStorage.setItem('skyline-rush-stars', JSON.stringify(career));
    if (startedAt) localStorage.setItem('skyline-rush-gt-trial-started-at', JSON.stringify(startedAt));
  }, { career, startedAt });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready', { timeout: ciTimeout(20_000) });
  if (garage) await openCars(page);
}

test('the GT stays locked at 17 stars until explicit trial activation', async ({ page, gameplayURL }) => {
  await enter(page, gameplayURL);
  await expect(gt(page)).toHaveAttribute('data-car-access', 'locked');
  await expect(page.getByText('17 / 18 Career stars')).toBeVisible();
  await gt(page).click();
  await expect(gt(page)).toHaveAttribute('data-car-preview', 'true');
  await expect(gt(page)).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => [
    localStorage.getItem('skyline-rush-car'),
    localStorage.getItem('skyline-rush-gt-trial-started-at'),
  ])).toEqual([null, null]);
  await page.getByRole('button', { name: 'Start 24-hour test drive' }).press('Enter');
  await expect(gt(page)).toHaveAttribute('data-car-access', 'trial');
  await expect(gt(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(gt(page)).toBeFocused();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready', { timeout: ciTimeout(20_000) });
  await openCars(page);
  await expect(gt(page)).toHaveAttribute('data-car-access', 'trial');
  await expect(gt(page)).toHaveAttribute('aria-pressed', 'true');
});

test('an expired test drive falls back to the Roadster and cannot be restarted', async ({ page, gameplayURL }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-car', JSON.stringify('crimson-gt')));
  await enter(page, gameplayURL, { startedAt: Date.now() - 172_800_000 });
  await expect(gt(page)).toHaveAttribute('data-car-access', 'locked');
  await expect(page.locator('#garage-screen [data-car="roadster"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Test drive ended')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start 24-hour test drive' })).toHaveCount(0);
});

test('18 Career stars allow the earned GT after the trial has expired', async ({ page, gameplayURL }) => {
  await enter(page, gameplayURL, { career: { ...stars, taipei: 3 }, startedAt: Date.now() - 172_800_000 });
  await expect(gt(page)).toHaveAttribute('data-car-access', 'owned');
  await gt(page).click();
  await expect(gt(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Start 24-hour test drive' })).toHaveCount(0);
});

test('the 18th Career star reveals the GT in the shared dialog and opens the Garage', async ({ page, gameplayURL }) => {
  await enter(page, gameplayURL, { career: { ...stars, coast: 2, taipei: 3 }, garage: false });
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText(/^(COUNTDOWN|RACING)$/);
  await page.evaluate(() => { window.gameplay.race.countdown = 0; });
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(20_000) });
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.elapsed = 60;
    Object.assign(race.player, { distance: race.length - 10, speed: 60, score: race.length });
  });
  const reveal = page.getByRole('dialog', { name: 'Reward reveal' });
  await expect(reveal.getByRole('heading', { name: 'Vantaire GT' })).toBeVisible({ timeout: ciTimeout(20_000) });
  await expect(reveal.locator('.acquisition-hero')).toHaveAttribute('data-kind', 'car');
  await reveal.getByRole('button', { name: 'Continue' }).click();
  await expect(reveal).toBeHidden();
  await expect(page.locator('#race-overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Go to Garage' }).click();
  await expect(page.locator('#garage-screen')).toBeVisible();
  await openGarageSection(page, 'cars');
  await expect(gt(page)).toHaveAttribute('data-car-access', 'owned');
});
