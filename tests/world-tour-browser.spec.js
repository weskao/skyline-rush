import { test, expect } from '@playwright/test';
const ids = ['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic'];
const newIds = ids.slice(5);
const seed = page => page.addInitScript(ids => {
  localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
  localStorage.setItem('skyline-rush-music', 'off');
}, ids);
test('ten full-route previews and bilingual names are available without exposing shortcuts', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await expect(page.locator('.track-route-map svg')).toHaveCount(10);
  await expect(page.locator('.track-route-map polyline')).toHaveCount(10);
  await page.locator('[data-locale="zh-TW"]').click();
  await expect(page.locator('[data-track="taipei"] strong')).toHaveText('台北古都');
  await expect(page.locator('[data-track="cosmic"] strong')).toHaveText('星際軌道');
  await page.locator('[data-locale="en"]').click();
  await expect(page.locator('[data-track="taipei"] strong')).toHaveText('Taipei Heritage');
});
for (const id of newIds) test(`new course ${id} renders without a WebGL crash and exposes racer HUD markers`, async ({page}) => {
  await seed(page);
  const errors=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  const button=page.locator(`[data-track="${id}"]`);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#track-note')).not.toBeEmpty();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-route-map [data-racer]')).toHaveCount(4);
  expect(errors).toEqual([]);
});
test('live minimap does not duplicate secret corridors and moves marker positions', async ({ page }) => {
  await seed(page);await page.goto('/');
  await page.locator('#start-button').click();
  const map=page.locator('#race-route-map svg');
  await expect(map.locator('polyline')).toHaveCount(1);
  await expect(map.locator('[data-racer]')).toHaveCount(4);
  const marker=map.locator('[data-racer="YOU"]');
  const start=await marker.getAttribute('cy');
  await page.waitForTimeout(5000);
  await expect(marker).not.toHaveAttribute('cy',start);
});
