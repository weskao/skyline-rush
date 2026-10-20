import { test, expect } from '@playwright/test';

const race = async (page, url) => {
  await page.goto(url);
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
};

test('?perf shows racing frame times for device checks', async ({ page }) => {
  await race(page, '/?perf');
  await expect(page.locator('#perf-overlay')).toHaveText(/^FRAME p50 \d+\.\d ms · p95 \d+\.\d ms · \d+(\.\d)? fps · \d+ s$/);
  const box = await page.locator('#perf-overlay').boundingBox();
  expect(box.y).toBeLessThan(40); // a thin strip at the top edge, not over the race view
});

test('without ?perf there is no overlay', async ({ page }) => {
  await race(page, '/');
  await page.waitForTimeout(800);
  await expect(page.locator('#perf-overlay')).toHaveCount(0);
});
