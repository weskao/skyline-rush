import { expect, test } from './helpers/test.js';
import { openSettingsSection } from './helpers/settings-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { captureHooks } from './helpers/gameplay-browser.js';
import { clickLobbyOption } from './helpers/home-lobby.js';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
    localStorage.setItem('skyline-rush-locale', 'zh-TW');
  });
});

const shot = (page, info, name) => process.env.UI_POLISH_SHOTS && page.screenshot({
  path: info.outputPath(name), animations: 'disabled', scale: 'css', timeout: ciTimeout(20_000),
});

test('all page-drawn selects share a bordered trigger and language keeps the globe', async ({ page }, info) => {
  await page.goto('/');
  await openSettingsSection(page, 'language');
  const language = page.locator('#locale-select + .custom-select > button');
  await expect(language).toHaveText('繁體中文');
  await expect(language).toHaveCSS('border-top-width', '1px');
  await expect(language).toHaveCSS('background-image', /circle/);
  const styles = await page.locator('.custom-select > button[role="combobox"]').evaluateAll(elements => elements.map(el => {
    const css = getComputedStyle(el);
    return [css.borderTopWidth, css.borderTopColor, css.borderRadius, css.backgroundColor, css.minHeight];
  }));
  expect(styles.length).toBeGreaterThan(15);
  expect(new Set(styles.map(style => JSON.stringify(style))).size).toBe(1);
  await language.click();
  await shot(page, info, 'dropdown-language.png');
  await language.press('Escape');
  await expect(language).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#settings-panel')).toBeVisible();
});

test.describe('portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('expanding race setup keeps the centre scene and Start clear', async ({ page }, info) => {
    await captureHooks(page);
    await page.goto('/');
    await expect(page.locator('#lobby-hero-track')).toHaveText('海岸公路');
    const intro = page.locator('#intro');
    const start = page.locator('#start-button');
    const expectDock = async () => {
      expect((await intro.boundingBox()).y).toBeGreaterThanOrEqual(844 * .5);
      await expect(start).toBeInViewport({ ratio: 1 });
      await expect(page.locator('#garage-button')).toBeInViewport({ ratio: 1 });
      await expect.poll(() => page.evaluate(() => {
        const scene = window.gameScene;
        if (!scene) return -1000;
        const anchor = scene.player.position.clone().project(scene.camera);
        return document.querySelector('#intro').getBoundingClientRect().top - (1 - anchor.y) * innerHeight / 2;
      }), { message: 'Keep the showcased car above the dock' }).toBeGreaterThan(46);
    };
    await expectDock();
    await shot(page, info, 'home-portrait.png');
    await page.locator('#lobby-modes-toggle').click();
    await expect(page.locator('button[data-race-mode="classic"]')).toBeVisible();
    await expectDock();
    await shot(page, info, 'home-portrait-modes.png');
    await page.locator('button[data-race-mode="custom"]').click();
    await page.locator('#race-mode-rules > summary').click();
    const weather = page.locator('#race-visual-preset + .custom-select > button');
    await weather.click();
    await expect(weather).toHaveAttribute('aria-expanded', 'true');
    await shot(page, info, 'dropdown-weather.png');
    await weather.press('End');
    await weather.press('Enter');
    await expect(weather).toHaveAttribute('aria-expanded', 'false');
    await expectDock();
  });

  test('the homepage airflow shortcut enters and exits the existing preview', async ({ page }, info) => {
    await page.goto('/');
    const shortcut = page.locator('#home-airflow-toggle');
    const settingsToggle = page.locator('#airflow-toggle');
    await expect(shortcut).toHaveAttribute('aria-pressed', 'false');
    await shortcut.click();
    await expect(page.locator('body')).toHaveClass(/airflow-active/);
    await expect(settingsToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#lobby-hero-track')).toBeHidden();
    await expect(page.locator('#start-button')).toBeInViewport({ ratio: 1 });
    await shot(page, info, 'home-airflow.png');
    await shortcut.click();
    await expect(page.locator('body')).not.toHaveClass(/airflow-active/);
    await expect(settingsToggle).toHaveAttribute('aria-pressed', 'false');
    await openSettingsSection(page, 'display');
    await settingsToggle.click();
    await expect(shortcut).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#settings-close').click();
    await shortcut.click();
    await expect(page.locator('#lobby-hero-track')).toBeVisible();
  });
});

for (const viewport of [{ width: 924, height: 412 }, { width: 1440, height: 900 }]) {
  test(`wide layout keeps race setup to the side at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const intro = page.locator('#intro');
    expect((await intro.boundingBox()).width).toBeLessThanOrEqual(viewport.width * .49);
    await expect(page.locator('#start-button')).toBeInViewport({ ratio: 1 });
    await shot(page, info, `home-${viewport.width}.png`);
  });
}


test('Photo Studio uses the same dropdown for lighting and fog', async ({ page }, info) => {
  await page.goto('/');
  await clickLobbyOption(page, 'button[data-race-mode="free"]');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(20_000) });
  await page.locator('#pause-button').click();
  await page.locator('#photo-open').click();
  await page.locator('#photo-advanced > summary').click();
  const lighting = page.locator('#photo-sky + .custom-select > button');
  await lighting.click();
  await expect(lighting).toHaveAttribute('aria-expanded', 'true');
  await shot(page, info, 'dropdown-photo.png');
  await lighting.press('End');
  await lighting.press('Enter');
  await expect(page.locator('#photo-sky')).toHaveValue('fog');
});

test('track selection is staged until confirmed and Escape keeps the current route', async ({ page }, info) => {
  await page.goto('/');
  const opener = page.locator('#lobby-tracks-toggle');
  const dialog = page.locator('#track-chooser');
  const title = page.locator('#lobby-hero-track');
  await expect(title).toHaveText('海岸公路');
  await opener.click();
  await expect(dialog).toBeVisible({ timeout: ciTimeout(5_000) });
  await dialog.locator('[data-track="neon"]').click();
  await expect(title).toHaveText('海岸公路');
  await shot(page, info, 'track-chooser-desktop.png');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.locator('[data-track="neon"]').click();
  await dialog.locator('#track-choose-confirm').click();
  await expect(dialog).toBeHidden();
  await expect(title).toHaveText('霓虹都會');
  await expect(page.locator('#lobby-hero-art')).toHaveAttribute('src', /neon\.jpg$/);
});

for (const [name, viewport, segments] of [
  ['phone', { width: 390, height: 844 }, null],
  ['landscape phone', { width: 844, height: 390 }, null],
  ['book fold', { width: 844, height: 390 }, [
    { left: 0, top: 0, width: 410, height: 390 }, { left: 434, top: 0, width: 410, height: 390 },
  ]],
  ['tabletop fold', { width: 600, height: 900 }, [
    { left: 0, top: 0, width: 600, height: 430 }, { left: 0, top: 460, width: 600, height: 440 },
  ]],
]) {
  test.describe(name, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });
    test('track chooser keeps every action in the available screen area', async ({ page }, info) => {
      if (segments) await page.addInitScript(value => {
        Object.defineProperty(window, 'viewport', { configurable: true, value: { segments: value } });
      }, segments);
      await page.goto('/');
      await page.locator('#lobby-tracks-toggle').tap();
      const dialog = page.locator('#track-chooser');
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      if (segments) {
        expect(segments.some(pane => box.x >= pane.left - 1 && box.y >= pane.top - 1 &&
          box.x + box.width <= pane.left + pane.width + 1 && box.y + box.height <= pane.top + pane.height + 1)).toBe(true);
      } else {
        expect(box).toEqual({ x: 0, y: 0, ...viewport });
      }
      await expect(dialog.locator('#track-choose-confirm')).toBeInViewport({ ratio: 1 });
      await expect(dialog.locator('#track-choose-close')).toBeInViewport({ ratio: 1 });
      await shot(page, info, 'track-chooser-' + name.replaceAll(' ', '-') + '.png');
      await dialog.locator('#track-choose-close').tap();
      await expect(dialog).toBeHidden();
    });
  });
}


for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`classic finish exposes scoring and actions immediately at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await captureHooks(page);
    await page.goto('/');
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(20_000) });
    await page.evaluate(() => {
      const { race } = window.gameplay;
      race.elapsed = 80;
      Object.assign(race.player, { distance: race.length - 10, speed: 60 });
    });
    const style = page.locator('#result-style');
    await expect(style).toBeVisible();
    await expect(style.locator('strong')).toContainText('風格分');
    await expect(style.locator('small')).toContainText('乾淨駕駛');
    await expect(style.locator('small')).toContainText('3 星');
    await expect(page.locator('#result-style-details')).toHaveCount(0);
    await expect(page.locator('#again-button')).toBeVisible();
    await shot(page, info, `result-style-${viewport.width}.png`);
  });
}
