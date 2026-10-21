import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

test.beforeEach(async ({ gameplayPage: page }) => {
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.locator('.brand').click();
});

test('brand click mid-race pauses and asks before leaving; Keep racing resumes', async ({ gameplayPage: page }) => {
  await expect(page.locator('#leave-screen')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
  await expect(page.locator('#leave-keep')).toBeFocused();
  await page.locator('#leave-keep').click();
  await expect(page.locator('#leave-screen')).toBeHidden();
  await expect(page.locator('#race-status')).toHaveText('RACING');
});

test('Escape dismisses the prompt but leaves the race paused', async ({ gameplayPage: page }) => {
  await page.keyboard.press('Escape');
  await expect(page.locator('#leave-screen')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
  await expect(page.locator('#resume-button')).toBeVisible();
});

test('End race returns to track select without reloading', async ({ gameplayPage: page }) => {
  await page.evaluate(() => { window.sameDocument = true; });
  await page.locator('#leave-end').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('#intro')).toBeVisible();
  expect(await page.evaluate(() => window.sameDocument)).toBe(true);
});

test('Back to home reloads to the intro', async ({ gameplayPage: page }) => {
  await page.evaluate(() => { window.sameDocument = true; });
  await Promise.all([page.waitForEvent('load'), page.locator('#leave-home').click()]);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  expect(await page.evaluate(() => window.sameDocument)).toBeUndefined();
});
