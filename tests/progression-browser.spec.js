import { test, expect } from '@playwright/test';

const dismissMusicPrompt = async page => {
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};
// Seeds storage on the first load only, so a reload proves what the page itself saved.
const seed = (page, data) => page.addInitScript(data => {
  if (sessionStorage.getItem('seeded')) return;
  const today = new Date();
  const id = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map(n => String(n).padStart(2, '0')).join('-');
  for (const [key, value] of Object.entries(data)) localStorage.setItem(key, JSON.stringify(value).replaceAll('TODAY', id));
  sessionStorage.setItem('seeded', '1');
}, data);
// A straight synthetic coast run: 50 s at 10 Hz.
const ghost = { time: 50, samples: Array.from({ length: 501 }, (_, k) => [k * 10, 2.5, 0]) };

test('owned paints equip and persist; locked paints stay preview only', async ({ page }) => {
  await seed(page, { 'skyline-rush-stars': { coast: 3 } });
  await page.goto('/');
  await dismissMusicPrompt(page);
  await page.getByRole('button', { name: 'Garage', exact: true }).click();
  const status = page.locator('#garage-status');
  const equip = page.getByRole('button', { name: 'Equip finish' });
  await expect(status).toContainText('Pearl · equipped');
  await expect(equip).toBeDisabled();
  await page.getByRole('button', { name: 'Preview aurora' }).click();
  await expect(status).toContainText('Aurora · owned');
  await expect(equip).toBeEnabled();
  await equip.click();
  await expect(status).toContainText('Aurora · equipped');
  await expect(equip).toBeDisabled();
  await page.getByRole('button', { name: 'Preview glacier' }).click();
  await expect(status).toContainText('Preview only · unlocks at 6 stars');
  await expect(equip).toBeDisabled();
  await page.getByRole('button', { name: 'Close garage' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-paint')))).toBe('aurora');
  await page.reload();
  await dismissMusicPrompt(page);
  await page.getByRole('button', { name: 'Garage', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview aurora' })).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toContainText('Aurora · equipped');
});

test('History shows awarded medals and today’s daily board; the daily run starts with its modifier', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await seed(page, {
    'skyline-rush-medals': { 'first-win': '2026-10-01T10:00:00.000Z', bogus: '2026-10-01T10:00:00.000Z' },
    'skyline-rush-daily': [{ id: 'TODAY', track: 'coast', modifier: 'gold-rings', time: 64.2, position: 2, score: 900, date: '2026-10-01T10:00:00.000Z' },
      { id: '<img src=x onerror=alert(1)>', track: 'coast', modifier: 'gold-rings', time: 1, position: 1, score: 1, date: 'x' }],
  });
  await page.goto('/');
  await dismissMusicPrompt(page);
  await page.locator('.history-button').click();
  await expect(page.locator('[data-medal="first-win"]')).toContainText('Awarded');
  await expect(page.locator('[data-medal="first-win"]')).toHaveClass(/is-awarded/);
  await expect(page.locator('[data-medal="clean-run"]')).toContainText('Not awarded');
  await expect(page.locator('#achievement-status')).toContainText('1 of 4 medals awarded');
  await expect(page.locator('#daily-status')).toContainText('Today:');
  await expect(page.locator('#daily-board')).toContainText('01:04.20');
  await expect(page.locator('#daily-board img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start daily challenge' }).click();
  await expect(page.getByRole('dialog', { name: 'Race history' })).toBeHidden();
  await expect(page.locator('#race-status')).toHaveText(/COUNTDOWN|RACING/);
  await expect(page.locator('.overlay-route')).toContainText('DAILY');
  expect(errors).toEqual([]);
});

test('a valid saved ghost is offered and its preference persists; a tampered ghost is ignored', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await seed(page, { 'skyline-rush-ghosts': { coast: ghost, neon: { ...ghost, samples: ghost.samples.slice(0, 10) } } });
  await page.goto('/');
  await dismissMusicPrompt(page);
  await page.locator('#controls-button').click();
  const toggle = page.getByRole('checkbox', { name: 'Show best-run ghost' });
  await expect(toggle).toBeEnabled();
  await expect(toggle).toBeChecked();
  await expect(page.locator('#ghost-status')).toContainText('00:50.00');
  await toggle.uncheck();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')).ghost)).toBe(false);
  await toggle.check();
  await page.locator('#controls-button').click();
  await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked', '["coast","neon"]'));
  await page.reload();
  await dismissMusicPrompt(page);
  await page.locator('[data-track="neon"]').click();
  await page.locator('#controls-button').click();
  await expect(page.locator('#ghost-status')).toContainText('No best-run replay');
  await page.locator('#controls-button').click();
  await page.locator('[data-track="coast"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  expect(errors).toEqual([]);
});
