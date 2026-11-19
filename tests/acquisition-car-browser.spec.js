import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

test.use({ keepAcquisitionOpen: true });

const fixture = (url, zh = false) => url + 'tests/fixtures/acquisition-reveal.html' + (zh ? '?zh' : '');

test('the shared reveal plays the actual vehicle and holds the final angle', async ({ page, gameplayURL }) => {
  await page.setViewportSize({ width: 1100, height: 740 });
  await page.goto(fixture(gameplayURL));
  await page.getByRole('button', { name: 'Present reward' }).click();
  const dialog = page.locator('#acquisition-reveal');
  const stage = dialog.locator('[data-cinematic]');
  await expect(dialog.getByRole('heading', { name: 'Vantaire GT' })).toBeVisible();
  await expect(stage).toHaveCount(1);
  await expect(stage).toHaveAttribute('data-cinematic', 'playing', { timeout: ciTimeout(20000) });
  await expect(dialog.locator('.acquisition-hero')).toHaveAttribute('data-reveal-shot', 'signature');
  await expect(stage).toHaveAttribute('data-shot', 'hero', { timeout: ciTimeout(16000) });
  await expect(dialog.locator('.acquisition-hero')).toHaveAttribute('data-reveal-shot', 'hero');
  await expect.poll(() => page.evaluate(() => window.revealCues.map(([name]) => name))).toEqual([
    'acquisition-car', 'acquisition-car-signature', 'acquisition-car-profile',
    'acquisition-car-thrusters', 'acquisition-car-hero',
  ]);
  await expect(stage).toHaveAttribute('data-cinematic', 'still');
  await expect(dialog.getByRole('button', { name: 'Continue' })).toBeInViewport();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(stage.locator('canvas')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.revealCues.slice(-2).map(([name]) => name)))
    .toEqual(['acquisition-stop', 'acquisition-item']);
});

test('vehicle title and continue fit in both mobile orientations with reduced motion', async ({ page, gameplayURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(fixture(gameplayURL, true));
  await page.getByRole('button', { name: 'Present reward' }).click();
  const dialog = page.locator('#acquisition-reveal');
  for (const viewport of [{ width: 390, height: 844 }, { width: 740, height: 360 }]) {
    await page.setViewportSize(viewport);
    await expect(dialog.getByRole('heading', { name: '夜鋒 GT' })).toBeInViewport();
    await expect(dialog.getByRole('button', { name: '繼續' })).toBeInViewport();
    await expect(dialog.locator('canvas')).toHaveCount(0);
    await expect(dialog.locator('.acquisition-art')).toHaveJSProperty('naturalWidth', 432);
  }
});

test('another catalog vehicle uses the same shots with its own model', async ({ page, gameplayURL }) => {
  const request = page.waitForResponse(response => response.url().endsWith('/models/roadster2/roadster2-low.glb'));
  await page.goto(fixture(gameplayURL) + '?roadster');
  await page.getByRole('button', { name: 'Present reward' }).click();
  expect((await request).ok()).toBe(true);
  const hero = page.locator('[data-car-showcase="roadster"]');
  await expect(hero.getByRole('heading', { name: 'Stratosway R2' })).toBeVisible();
  await expect(hero.locator('[data-cinematic]')).toHaveAttribute('data-shot', 'hero', { timeout: ciTimeout(20000) });
});

test('a failed car model fetch restores the card art and leaves Continue available', async ({ page, gameplayURL }) => {
  await page.route('**/models/crimson-gt/*.glb', route => route.fulfill({ status: 404 }));
  await page.goto(fixture(gameplayURL));
  await page.getByRole('button', { name: 'Present reward' }).click();
  const dialog = page.locator('#acquisition-reveal');
  await expect(dialog.locator('[data-cinematic]')).toHaveAttribute('data-cinematic', 'static');
  await expect(dialog.locator('.acquisition-art')).toBeVisible();
  await expect(dialog.locator('.acquisition-art')).toHaveJSProperty('naturalWidth', 432);
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog.getByRole('heading', { name: 'Collection token' })).toBeVisible();
});
