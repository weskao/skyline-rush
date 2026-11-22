import { expect, test, waitForHome } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

test.use({ startupSeen: false });

test('track chooser installs a versioned visual pack once, then reuses it after reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-sound', 'off');
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', comfortable: true }));
  });
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  const card = page.locator('#lobby-track-options [data-track="coast"]');
  const download = page.locator('#track-choose-download');
  await card.click();
  await expect(card).toHaveAttribute('data-pack-state', 'missing', { timeout: ciTimeout(10000) });
  await expect(download).toBeVisible();
  await expect(page.locator('#track-choose-pack-version')).toContainText('v1.0.0');
  await download.click();
  await expect(card).toHaveAttribute('data-pack-state', 'ready', { timeout: ciTimeout(15000) });
  await expect(download).toBeHidden();

  await page.reload();
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  await expect(card).toHaveAttribute('data-pack-state', 'ready', { timeout: ciTimeout(15000) });
  await expect(download).toBeHidden();
  await page.locator('#track-choose-confirm').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#world')).toBeVisible({ timeout: ciTimeout(20000) });
  await expect(page.locator('#world')).toHaveAttribute('data-race-load-ms', /^\d+\.\d$/);
});

test('track download indicator stays legible on a wide chooser', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', comfortable: true })));
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  await expect(page.locator('#track-choose-pack-version')).toBeVisible();
  const buttons = page.locator('#lobby-track-options > button');
  await expect(buttons.first()).toHaveAttribute('data-pack-state', /^(checking|missing|ready|update|unavailable)$/);
  await expect(page.locator('#track-choose-confirm')).toBeVisible();
});
