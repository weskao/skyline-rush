import { expect, test, settled } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

for (const [name, viewport, locale] of [
  ['desktop', { width: 1440, height: 900 }, 'en-US'],
  ['portrait', { width: 390, height: 844 }, 'zh-TW'],
  ['landscape', { width: 844, height: 390 }, 'en-US'],
  ['fold cover', { width: 344, height: 882 }, 'zh-TW'],
]) {
  test.describe(name, () => {
    test.use({ viewport, locale, hasTouch: name !== 'desktop', isMobile: name !== 'desktop' });
    test('the lobby keeps the selected race and settings destinations reachable', async ({ page }, testInfo) => {
      test.setTimeout(ciTimeout(90_000));
      await page.addInitScript(() => {
        localStorage.setItem('skyline-rush-music', 'off');
        localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      const track = page.locator('[data-track="neon"]');
      const modes = page.locator('#lobby-modes-toggle');
      const tracks = page.locator('#lobby-tracks-toggle');
      if (name !== 'desktop') {
        await expect(track).toBeHidden();
        await expect(page.locator('#lobby-race-distance')).toBeVisible();
        await modes.click();
        await expect(page.locator('[data-race-mode="classic"] > svg')).toBeVisible();
        await tracks.click();
        await expect(modes).toHaveAttribute('aria-expanded', 'false');
      }
      await expect(track).toBeVisible();
      await track.click();
      await expect(page.locator('#lobby-hero-track')).toHaveText(locale === 'zh-TW' ? '霓虹都會' : 'Neon Downtown');
      await expect(page.locator('#start-button')).toBeDisabled();
      await page.locator('[data-track="coast"]').click();
      const settings = page.locator('#settings-button');
      await settings.click();
      await page.locator('[data-settings-destination="#controls-button"]').click();
      await expect(page.locator('#controls-panel')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#controls-panel')).toBeHidden();
      await settings.click();
      await page.locator('[data-settings-destination="#vfx-panel > summary"]').click();
      await expect(page.locator('#vfx-panel')).toHaveAttribute('open', '');
      await page.locator('#vfx-panel > summary').click();
      await settings.click();
      await page.locator('[data-settings-destination^="#locale-select"]').click();
      await expect(page.locator('#locale-select + .custom-select [role="listbox"]')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.locator('#intro').evaluate(el => { el.scrollTop = 0; });
      if (process.env.UI_OVERHAUL_SHOTS) await page.screenshot({ path: testInfo.outputPath('lobby.png'), animations: 'disabled', scale: 'css' });
      await page.locator('#garage-button').click();
      await settled(page.locator('#garage-screen'));
      await page.locator('#garage-studio-open').click();
      await expect(page.locator('#garage-auto-rotate > svg')).toBeVisible();
      const pose = page.locator('#garage-pose-action');
      await expect(pose.locator('svg')).toHaveCount(2);
      await expect(pose).toHaveAttribute('aria-checked', 'false');
      await pose.click();
      await expect(pose).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-mode', 'flight');
      await expect(page.locator('#garage-zoom-in')).toHaveAccessibleName(locale === 'zh-TW' ? '放大' : 'Zoom in');
      if (process.env.UI_OVERHAUL_SHOTS) await page.screenshot({ path: testInfo.outputPath('studio.png'), animations: 'disabled', scale: 'css' });
    });
  });
}
