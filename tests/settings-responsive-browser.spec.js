import { expect, test } from './helpers/test.js';
import { openSettingsSection } from './helpers/settings-browser.js';

const layouts = [
  ['desktop', 1440, 900],
  ['portrait', 390, 844],
  ['landscape', 844, 390],
  ['fold-book', 844, 390, [{ left: 0, top: 0, width: 410, height: 390 }, { left: 434, top: 0, width: 410, height: 390 }]],
  ['fold-tabletop', 600, 900, [{ left: 0, top: 0, width: 600, height: 430 }, { left: 0, top: 460, width: 600, height: 440 }]],
];

for (const [name, width, height, segments] of layouts) {
  test.describe(name, () => {
    test.use({ viewport: { width, height }, hasTouch: name !== 'desktop', isMobile: name !== 'desktop',
      locale: name === 'portrait' || name === 'fold-tabletop' ? 'zh-TW' : 'en-US', reducedMotion: 'reduce' });
    test('settings reach every section without crossing the viewport or the hinge', async ({ page }, info) => {
      await page.addInitScript(segments => {
        localStorage.setItem('skyline-rush-music', 'off');
        localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
        if (segments) Object.defineProperty(window, 'viewport', { configurable: true, value: { segments } });
      }, segments);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const gear = page.locator('#settings-button');
      await expect(gear).toBeVisible();
      for (const selector of ['#assist-button', '#airflow-toggle', '#controls-button', '#settings-language'])
        await expect(page.locator(selector)).toBeHidden();
      if (name === 'portrait' || name === 'fold-book') {
        await page.locator('#lobby-tracks-toggle').click();
        const card = page.locator('[data-track="coast"]');
        await expect(card).toBeVisible();
        await expect(card.locator('.track-preview')).toHaveCSS('position', 'absolute');
        await expect(card.locator('.track-route-map')).toHaveCSS('position', 'relative');
        await page.locator('#lobby-tracks-toggle').click();
      }
      await openSettingsSection(page, 'display');
      const dialog = page.locator('#settings-panel');
      const rect = await dialog.boundingBox();
      const panes = segments || [{ left: 0, top: 0, width, height }];
      expect(panes.some(pane => rect.x >= pane.left && rect.y >= pane.top &&
        rect.x + rect.width <= pane.left + pane.width && rect.y + rect.height <= pane.top + pane.height)).toBe(true);
      const overflow = await dialog.locator('.settings-content').evaluate(el => ({
        x: el.scrollWidth > el.clientWidth,
        y: el.scrollHeight > el.clientHeight,
      }));
      expect(overflow).toEqual({ x: false, y: true });
      if (process.env.UI_OVERHAUL_SHOTS) await page.screenshot({ path: info.outputPath('settings.png'), timeout: 12000 });
      await openSettingsSection(page, 'driving');
      await expect(dialog.locator('#controls-panel')).toBeVisible();
      await openSettingsSection(page, 'audio');
      await expect(dialog.locator('#mute-all')).toBeVisible();
      await openSettingsSection(page, 'language');
      const language = dialog.locator('#locale-select + .custom-select > button');
      await language.click();
      await expect(language).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(language).toHaveAttribute('aria-expanded', 'false');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(gear).toBeFocused();
    });
  });
}
