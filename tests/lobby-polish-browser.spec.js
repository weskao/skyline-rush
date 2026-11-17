import { expect } from './helpers/test.js';
import { openSettingsSection } from './helpers/settings-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { captureHooks, test } from './helpers/gameplay-browser.js';
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

test('desktop Home leaves the track scene unshaded', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('#world')).toBeVisible();
  await shot(page, info, 'unshaded-home-desktop.png');
  await expect(page.locator('.scene-shade')).toHaveCSS('background-image', 'none');
  await expect(page.locator('.topbar')).toHaveCSS('background-image', 'none');
});

test.describe('rotating a touch device on Home', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('leaves the track scene unshaded in each orientation and on tablets', async ({ page }, info) => {
    await page.goto('/');
    await expect(page.locator('#world')).toBeVisible();
    for (const [width, height] of [[390, 844], [844, 390], [820, 1180]]) {
      await page.setViewportSize({ width, height });
      await shot(page, info, `unshaded-home-${width}x${height}.png`);
      await expect.soft(page.locator('.scene-shade')).toHaveCSS('background-image', 'none', { timeout: ciTimeout(2000) });
      await expect.soft(page.locator('.topbar')).toHaveCSS('background-image', 'none', { timeout: ciTimeout(2000) });
      const fallbackShade = await page.locator('#upcoming-scene').evaluate(el => getComputedStyle(el, '::after').backgroundImage);
      expect.soft(fallbackShade, 'the concept-image fallback also leaves the scene unshaded').toBe('none');
    }
  });

  test('keeps the running Start sweep inside the button when rotating both ways', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const start = page.locator('#start-button');
    await expect(start).toBeEnabled();
    for (const [width, height] of [[390, 844], [844, 390], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await expect(start).toBeInViewport({ ratio: 1 });
      const frames = await start.evaluate(button => {
        const sweep = button.getAnimations({ subtree: true }).find(animation => animation.animationName === 'start-sheen');
        sweep.pause();
        const { delay, duration } = sweep.effect.getTiming();
        const samples = [0.62, 0.81].map(progress => {
          sweep.currentTime = delay + duration * progress;
          const shine = getComputedStyle(button, '::after');
          return { inset: shine.inset, translate: shine.translate, position: shine.backgroundPosition };
        });
        sweep.play();
        return samples;
      });
      for (const frame of frames) {
        expect.soft(frame.inset).toBe('0px');
        expect.soft(frame.translate, `moving gradient stays inside the button at ${width}x${height}`).toBe('none');
      }
      expect.soft(frames[0].position, 'the highlight still moves across the button').not.toBe(frames[1].position);
    }
  });
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

  test('expanding race setup keeps the centre scene and Start clear', async ({ page, gameplayURL }, info) => {
    await captureHooks(page);
    await page.goto(gameplayURL);
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


test.describe('short-landscape Home wallet spacing', () => {
  test.use({ viewport: { width: 345, height: 206 }, hasTouch: true, isMobile: true });

  test('keeps a visible gap between the resource row and selected track card', async ({ page }, info) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    for (const [width, height] of [[345, 206], [667, 375], [743, 340], [852, 393]]) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await expect(page.locator('#intro .home-resource-strip')).toBeVisible();
        const [topbar, hero] = await Promise.all([
          page.locator('#intro .home-intro-topbar').boundingBox(),
          page.locator('#intro .lobby-race-heading').boundingBox(),
        ]);
        expect(topbar, 'Home resource row exists').not.toBeNull();
        expect(hero, 'selected track card exists').not.toBeNull();
        expect(hero.y - (topbar.y + topbar.height),
          `${width}x${height} keeps 6px between resources and the track card`).toBeGreaterThanOrEqual(6);
        await shot(page, info, `home-landscape-resource-gap-${width}x${height}.png`);
      });
    }
  });
});

test('iPhone landscape reserves room for the route icon and long localized track title', async ({ page }, info) => {
  await page.setViewportSize({ width: 852, height: 393 });
  await page.goto('/');
  for (const [selector, title] of [
    ['[data-track="coast"]', '海岸公路'],
    ['[data-upcoming-track="stormline-megacity"]', '霓虹暴雨都市'],
  ]) {
    await clickLobbyOption(page, selector);
    await expect(page.locator('#lobby-hero-track')).toHaveText(title);
    const [map, name, action] = await Promise.all([
      '#lobby-hero-map', '.lobby-track-copy', '#lobby-tracks-toggle > span',
    ].map(selector => page.locator(selector).boundingBox()));
    expect(map.x + map.width + 4, 'route icon clears track text').toBeLessThanOrEqual(name.x);
    expect(name.x + name.width).toBeLessThanOrEqual(action.x + 1);
    await expect(page.locator('#lobby-tracks-toggle')).toBeInViewport({ ratio: 1 });
  }
  await shot(page, info, 'home-layout-landscape.png');
});

test('wide desktop anchors the controls near the top left and leaves the scene open', async ({ page }, info) => {
  await page.setViewportSize({ width: 1920, height: 975 });
  await page.goto('/');
  await clickLobbyOption(page, '[data-track="coastal"]');
  const panel = await page.locator('#intro').boundingBox();
  const firstRow = await page.locator('.home-intro-topbar').boundingBox();
  const start = await page.locator('#start-button').boundingBox();
  expect(panel.x).toBeLessThanOrEqual(68);
  expect(firstRow.y).toBeLessThanOrEqual(155);
  expect(panel.width).toBeLessThanOrEqual(720);
  expect(start.y + start.height).toBeLessThanOrEqual(975 - 90);
  await shot(page, info, 'home-layout-desktop.png');
});

test('phone portrait keeps the wordmark and resources above the preview and the dock below it', async ({ page, gameplayURL }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(gameplayURL);
  await expect(page.locator('.topbar .brand > span')).toBeVisible();
  const [brand, wallet, card, mode, start] = await Promise.all([
    '.topbar .brand', '#intro .home-resource-strip', '.lobby-race-heading', '#lobby-modes-toggle', '#start-button',
  ].map(selector => page.locator(selector).boundingBox()));
  expect(brand.y + brand.height).toBeLessThanOrEqual(wallet.y);
  expect(wallet.y + wallet.height).toBeLessThan(844 * .25);
  expect(card.y).toBeGreaterThanOrEqual(844 * .615);
  expect(card.y + card.height).toBeLessThanOrEqual(mode.y);
  expect(mode.y + mode.height).toBeLessThanOrEqual(start.y);
  await expect(page.locator('#intro .wallet-currency')).toHaveCount(3);
  await page.locator('#intro .wallet-currency').first().click();
  await expect(page.locator('.wallet-detail')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.wallet-detail')).toBeHidden();
  await shot(page, info, 'home-layout-portrait.png');
});

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
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const opener = page.locator('#lobby-tracks-toggle');
  const dialog = page.locator('#track-chooser');
  const title = page.locator('#lobby-hero-track');
  await expect(title).toHaveText('海岸公路');
  await opener.click();
  await expect(dialog).toBeVisible({ timeout: ciTimeout(5_000) });
  const current = dialog.locator('[data-track="coast"]');
  const preview = dialog.locator('[data-track="neon"]');
  await preview.click();
  await expect(current).toHaveAttribute('aria-current', 'true');
  await expect(current).toHaveAttribute('aria-pressed', 'false');
  await expect(preview).toHaveAttribute('aria-pressed', 'true');
  await expect(preview).not.toHaveAttribute('aria-current', 'true');
  await expect(dialog.locator('#track-choose-selection')).toHaveText('霓虹都會');
  await expect(dialog.locator('#track-choose-map svg')).toBeVisible();
  await expect(dialog.locator('#track-choose-confirm')).toHaveAccessibleName('確認賽道');
  await expect(dialog).toHaveCSS('animation-name', 'chooser-in');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog).toHaveCSS('animation-name', 'none');
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
  await opener.click();
  await expect(preview).toHaveAttribute('aria-current', 'true');
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
      if (segments) await expect(page.locator('.scene-shade')).toHaveCSS('background-image', 'none');
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


for (const viewport of [{ width: 390, height: 844 }, { width: 667, height: 375 }, { width: 844, height: 390 }]) {
  test(`classic finish exposes scoring and actions immediately at ${viewport.width}x${viewport.height}`, async ({ page, gameplayURL }, info) => {
    await page.setViewportSize(viewport);
    await captureHooks(page);
    await page.addInitScript(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon'])));
    await page.goto(gameplayURL);
    await clickLobbyOption(page, '[data-track="neon"]');
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
    await expect(style.locator('small')).toContainText(/2 星：2500 分.*3 星：5000 分/);
    await expect(style.locator('strong')).toBeInViewport({ ratio: 1 });
    await expect(style.locator('small')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('#result-style-details')).toHaveCount(0);
    await expect(page.locator('#again-button')).toBeVisible();
    await shot(page, info, `result-style-${viewport.width}.png`);
  });
}
