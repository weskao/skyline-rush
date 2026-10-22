import { test, expect } from '@playwright/test';

test('mode selection changes ready-screen rules without touching the campaign track lock', async ({ page }) => {
  await page.goto('/');
  await page.locator('#race-setup > summary').click();
  await page.locator('#race-mode').evaluate(select => {
    select.value = 'custom';
    select.dispatchEvent(new Event('change', { bubbles:true }));
  });
  await expect(page.locator('#custom-rules')).toBeVisible();
  await page.locator('#race-rivals').evaluate(select => {
    select.value = '0';
    select.dispatchEvent(new Event('change', { bubbles:true }));
  });
  await expect(page.locator('.route-drivers')).toHaveText('1 DRIVERS');
  await expect(page.locator('#start-button')).toBeEnabled();
  await page.locator('#race-mode').evaluate(select => {
    select.value = 'time';
    select.dispatchEvent(new Event('change', { bubbles:true }));
  });
  await expect(page.locator('#custom-rules')).toBeHidden();
  await expect(page.locator('#selected-race-mode')).toHaveText('Time Attack');
});

test('Free Drive does not show an official result at the normal finish', async ({ page }) => {
  await page.goto('/');
  await page.locator('#race-mode').evaluate(select => {
    select.value = 'free';
    select.dispatchEvent(new Event('change', { bubbles:true }));
  });
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toContainText('RACING');
  await page.keyboard.press('Escape');
  await expect(page.locator('#exit-free')).toBeVisible();
  await page.locator('#exit-free').click();
  await expect(page.locator('#intro')).toBeVisible();
});
