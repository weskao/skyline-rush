import { test, expect } from './helpers/test.js';
import { clickLobbyOption } from './helpers/home-lobby.js';
import { ciTimeout } from './helpers/ci.js';

const MODES = ['classic', 'custom', 'free', 'time', 'gauntlet', 'checkpoint',
  'cup', 'stunt', 'endless', 'circuit', 'elimination'];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`Home keeps live track art and a distinct mode preview across all modes (${viewport.width}x${viewport.height})`, async ({ page }) => {
    test.setTimeout(ciTimeout(150_000));
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.setItem('skyline-rush-locale', 'zh-TW');
      localStorage.setItem('skyline-rush-music', 'off');
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
    });
    await page.goto('/');
    const preview = page.locator('#home-mode-preview');
    await expect(preview).toBeVisible();
    for (const mode of MODES) {
      await clickLobbyOption(page, `button[data-race-mode="${mode}"]`);
      await expect(preview).toHaveAttribute('data-mode', mode);
      await expect(page.locator('#home-mode-preview-title')).not.toBeEmpty();
      await expect(page.locator('#home-mode-preview-description')).not.toBeEmpty();
      await expect(page.locator('#home-mode-preview-rules')).not.toBeEmpty();
      await expect(preview.locator('svg')).toBeVisible();
      await expect(page.locator('#world')).toBeVisible();
      if (mode === 'circuit') {
        await expect(page.locator('#lobby-hero-map')).toHaveAttribute('data-theme', 'harbor-circuit');
        await expect(page.locator('#lobby-hero-map svg')).toBeVisible();
      }
      const bounds = await preview.boundingBox();
      expect(bounds.x, mode).toBeGreaterThanOrEqual(0);
      expect(bounds.y, mode).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width, mode).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds.y + bounds.height, mode).toBeLessThanOrEqual(viewport.height + 1);
    }
  });
}

test('a Coming Soon map remains visible on Home when changing ordinary game modes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-music', 'off'));
  await page.goto('/');
  await clickLobbyOption(page, '[data-upcoming-track="dune-tempest"]');
  for (const mode of ['custom', 'free', 'time', 'gauntlet', 'checkpoint', 'cup', 'stunt', 'endless', 'elimination', 'classic']) {
    await clickLobbyOption(page, `button[data-race-mode="${mode}"]`);
    await expect(page.locator('#intro')).toHaveAttribute('data-lobby-track', 'dune-tempest');
    await expect(page.locator('#home-mode-preview')).toHaveAttribute('data-mode', mode);
    await expect(page.locator('#start-button')).toBeDisabled();
  }
  await clickLobbyOption(page, 'button[data-race-mode="circuit"]');
  await expect(page.locator('#intro')).toHaveAttribute('data-lobby-track', 'harbor-circuit');
  await expect(page.locator('#home-mode-preview')).toHaveAttribute('data-mode', 'circuit');
});

test('the Event Lab authored race has its own Home mode preview before Start', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-unlocked', '["coast","neon"]');
  });
  await page.goto('/');
  await clickLobbyOption(page, 'button[data-race-mode="eventlab"]');
  await expect(page.locator('#event-lab-dialog')).toBeVisible();
  await page.locator('#lab-use').click();
  await expect(page.locator('#event-lab-dialog')).toBeHidden();
  await expect(page.locator('#home-mode-preview')).toHaveAttribute('data-mode', 'eventlab');
  await expect(page.locator('#home-mode-preview-title')).not.toBeEmpty();
  await expect(page.locator('#world')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
});
