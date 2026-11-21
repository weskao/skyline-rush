import { clickLobbyOption } from './helpers/home-lobby.js';
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
        await expect(page.locator('button[data-race-mode="classic"] > svg')).toBeVisible();
        await tracks.click();
        await expect(modes).toHaveAttribute('aria-expanded', 'false');
      } else await tracks.click();
      await expect(track).toBeVisible();
      await track.click();
      await page.locator('#track-choose-confirm').click();
      await expect(page.locator('#lobby-hero-track')).toHaveText(locale === 'zh-TW' ? '霓虹都會' : 'Neon Downtown');
      await expect(page.locator('#start-button')).toBeDisabled();
      await clickLobbyOption(page, '[data-track="coast"]');
      await expect(page.locator('.toolbar #settings-button')).toHaveCount(1);
      await expect(page.locator('#controls-button, #airflow-toggle, #settings-language .custom-select')).not.toHaveCount(0);
      for (const id of ['controls-button', 'airflow-toggle', 'settings-language'])
        await expect(page.locator('#' + id)).toBeHidden();
      await page.locator('#settings-button').click();
      const settings = page.getByRole('dialog');
      await expect(settings).toHaveCount(1);
      await expect(page.locator('#settings-close')).toBeFocused();
      for (const [tab, target] of [['driving', '#controls-panel'], ['display', '[data-vfx="quality"] + .custom-select'],
        ['audio', '#mute-all'], ['language', '#locale-select + .custom-select']]) {
        await settings.locator(`[data-settings-section="${tab}"]`).click();
        await expect(settings.locator(target)).toBeVisible();
      }
      const language = page.locator('#locale-select + .custom-select button');
      await language.click();
      await page.keyboard.press('Escape');
      await expect(language).toHaveAttribute('aria-expanded', 'false');
      await expect(settings).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#settings-panel')).toBeHidden();
      await expect(page.locator('#settings-button')).toBeFocused();
      await page.locator('#intro').evaluate(el => { el.scrollTop = 0; });
      if (process.env.UI_OVERHAUL_SHOTS) await page.screenshot({ path: testInfo.outputPath('lobby.png'), animations: 'disabled', scale: 'css' });
      await page.locator('#garage-button').click();
      await settled(page.locator('#garage-screen'));
      await page.locator('#garage-studio-open').click();
      // f947f938 replaced the Studio's line icons with illustrated collectible artwork.
      await expect(page.locator('#garage-auto-rotate > .collectible-icon')).toBeVisible();
      const pose = page.locator('#garage-pose-action');
      await expect(pose.locator('.collectible-icon')).toHaveCount(2);
      await expect(pose).toHaveAttribute('aria-checked', 'false');
      await pose.click();
      await expect(pose).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-mode', 'flight');
      await expect(page.locator('#garage-zoom-in')).toHaveAccessibleName(locale === 'zh-TW' ? '放大' : 'Zoom in');
      if (process.env.UI_OVERHAUL_SHOTS) await page.screenshot({ path: testInfo.outputPath('studio.png'), animations: 'disabled', scale: 'css' });
    });
  });
}
