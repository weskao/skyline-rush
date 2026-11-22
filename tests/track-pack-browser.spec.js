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
  const download = page.locator('#lobby-track-options [data-pack-for="coast"]');
  await card.click();
  await expect(card).toHaveAttribute('data-pack-state', 'missing', { timeout: ciTimeout(10000) });
  await expect(download).toBeVisible();
  await expect(page.locator('#track-choose-pack-version')).toContainText('v1.0.0');
  await download.click();
  await expect(card).toHaveAttribute('data-pack-state', 'ready', { timeout: ciTimeout(15000) });
  await expect(download).toBeDisabled();
  const cachedImage = await card.locator('.track-preview img').getAttribute('src');
  await page.context().setOffline(true);
  let offlineCached = false;
  try {
    offlineCached = await page.evaluate(async url => {
      try { return (await fetch(url)).ok; } catch { return false; }
    }, cachedImage);
  } finally { await page.context().setOffline(false); }
  expect(offlineCached).toBe(true);

  await page.reload();
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  await expect(card).toHaveAttribute('data-pack-state', 'ready', { timeout: ciTimeout(15000) });
  await expect(download).toBeDisabled();
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
  const buttons = page.locator('#lobby-track-options .track-card-select');
  await expect(buttons.first()).toHaveAttribute('data-pack-state', /^(checking|missing|ready|update|unavailable)$/);
  await expect(page.locator('#track-choose-confirm')).toBeVisible();
});

test('each track owns a separate circular download action and download-all skips cached packs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', comfortable: true })));
  await page.goto('/');
  await page.locator('#startup-enter').click();
  await waitForHome(page);
  await page.locator('#lobby-tracks-toggle').click();
  const select = page.locator('#lobby-track-options [data-track="neon"]');
  const action = page.locator('#lobby-track-options [data-pack-for="neon"]');
  await expect(action).toBeVisible({ timeout: ciTimeout(12000) });
  await action.click();
  await expect(select).not.toHaveAttribute('aria-pressed', 'true');
  await expect(action).toHaveAttribute('data-pack-state', 'ready', { timeout: ciTimeout(15000) });
  await expect(action).toBeDisabled();
  const all = page.locator('#track-choose-download-all');
  await expect(all).toBeVisible();
  await all.click();
  await expect(page.locator('#track-choose-pack-summary')).toContainText('16/16', { timeout: ciTimeout(45000) });
  await expect(all).toBeDisabled();
  await expect(page.locator('#lobby-track-options .track-pack-action')).toHaveCount(16);
});
