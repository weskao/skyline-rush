import { expect, gotoHome, test } from './helpers/test.js';
import { clickLobbyOption } from './helpers/home-lobby.js';
import { openSettingsSection } from './helpers/settings-browser.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-music', 'off'));
});

const layouts = [
  ['desktop', 1440, 900],
  ['portrait', 390, 844],
  ['landscape', 844, 390],
  ['short landscape', 756, 265],
  ['fold book', 844, 390, [{ left: 0, top: 0, width: 410, height: 390 }, { left: 434, top: 0, width: 410, height: 390 }]],
];

async function expectAllOptionsReachable(list, segments) {
  const clipped = await list.getByRole('option').evaluateAll((options, panes) => {
    const view = panes ?? [{ left: 0, top: 0, width: innerWidth, height: innerHeight }];
    return options.filter(option => {
      const r = option.getBoundingClientRect();
      const inPane = view.some(pane => r.left >= pane.left && r.right <= pane.left + pane.width &&
        r.top >= pane.top && r.bottom <= pane.top + pane.height);
      return !inPane || ![r.top + 3, (r.top + r.bottom) / 2, r.bottom - 3].every(y =>
        option.contains(document.elementFromPoint((r.left + r.right) / 2, y)));
    }).map(option => option.textContent);
  }, segments);
  expect(clipped).toEqual([]);
}

for (const [name, width, height, segments] of layouts) {
  const touch = name !== 'desktop';
  test.describe(name, () => {
    test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });

    test('Home weather opens every option without moving the race setup', async ({ page }, info) => {
      await page.addInitScript(segments => {
        if (segments) Object.defineProperty(window, 'viewport', { configurable: true, value: { segments } });
      }, segments);
      await gotoHome(page);
      await clickLobbyOption(page, 'button[data-race-mode="custom"]', touch ? 'tap' : 'click');
      await page.locator('#race-mode-rules > summary')[touch ? 'tap' : 'click']();
      const weather = page.locator('#race-visual-preset + .custom-select');
      const trigger = weather.getByRole('combobox');
      await trigger.scrollIntoViewIfNeeded();
      const readScroll = () => page.locator('#intro').evaluate(el => el.scrollTop);
      const before = await readScroll();
      const startBefore = await page.locator('#start-button').boundingBox();
      await trigger[touch ? 'tap' : 'click']();
      const list = weather.getByRole('listbox');
      await expect(list.getByRole('option')).toHaveText(['Track atmosphere', 'Daylight', 'Dusk', 'Night', 'Rain', 'Fog']);
      if (process.env.UI_OVERHAUL_SHOTS) await page.screenshot({ path: info.outputPath('weather.png') });
      await expectAllOptionsReachable(list, segments);
      expect(await readScroll()).toBe(before);
      expect(await page.locator('#start-button').boundingBox()).toEqual(startBefore);
      await list.getByRole('option', { name: 'Fog', exact: true })[touch ? 'tap' : 'click']();
      await expect(page.locator('#race-visual-preset')).toHaveValue('fog');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('Settings tabs fit and the camera choices leave content scroll in place', async ({ page }, info) => {
      await page.addInitScript(segments => {
        if (segments) Object.defineProperty(window, 'viewport', { configurable: true, value: { segments } });
      }, segments);
      await gotoHome(page);
      await openSettingsSection(page, 'display');
      const tabs = page.locator('.settings-sections');
      const display = tabs.getByRole('button', { name: 'Display & HUD' });
      if (process.env.UI_OVERHAUL_SHOTS) await page.screenshot({ path: info.outputPath('settings.png') });
      await expect(tabs.locator('button svg[aria-hidden="true"]')).toHaveCount(4);
      await expect(tabs).toHaveCSS('row-gap', /^(8|10)px$/);
      await expect(display).toHaveAttribute('aria-pressed', 'true');
      for (const tab of await tabs.getByRole('button').all()) {
        await expect(tab).toBeInViewport({ ratio: 1 });
        expect((await tab.boundingBox()).height).toBeGreaterThanOrEqual(44);
      }
      const camera = page.locator('[data-vfx="view"] + .custom-select');
      const trigger = camera.getByRole('combobox');
      await trigger.scrollIntoViewIfNeeded();
      const readScroll = () => page.locator('.settings-content').evaluate(el => el.scrollTop);
      const before = await readScroll();
      await trigger[touch ? 'tap' : 'click']();
      const list = camera.getByRole('listbox');
      await expect(list.getByRole('option')).toHaveCount(6);
      if (process.env.UI_OVERHAUL_SHOTS) await page.screenshot({ path: info.outputPath('camera.png') });
      await expectAllOptionsReachable(list, segments);
      expect(await readScroll()).toBe(before);
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-vfx="view"]')).toHaveValue('orbit');
      await expect(trigger).toBeFocused();
      await expect(display).toHaveAttribute('aria-pressed', 'true');
    });
  });
}

test('Home weather shows the extra options for the chosen track', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon'])));
  await gotoHome(page);
  await clickLobbyOption(page, 'button[data-race-mode="custom"]');
  await clickLobbyOption(page, '[data-track="canyon"]');
  await page.locator('#race-mode-rules > summary').click();
  const picker = page.locator('#race-visual-preset + .custom-select');
  await picker.getByRole('combobox').click();
  await expect(picker.getByRole('option')).toHaveCount(7);
  await picker.getByRole('option', { name: /snow/i }).click();
  await expect(page.locator('#race-visual-preset')).toHaveValue('snow');
});
