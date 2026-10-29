import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

const inViewport = async (page, locator) => {
  const box = await locator.boundingBox();
  const { width, height } = page.viewportSize();
  return box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1;
};

test('home Practice opens the guide on the practice call to action, which starts the lesson', async ({ page }) => {
  await page.goto('/');
  await page.locator('#practice-button').click();
  await expect(page.locator('#guide-screen')).toBeVisible();
  await expect(page.locator('#guide-practice')).toBeFocused();
  // The practice call to action leads the guide, above the device tabs and key list.
  const [practiceBox, devicesBox] = [await page.locator('#guide-practice').boundingBox(), await page.locator('.guide-devices').boundingBox()];
  expect(practiceBox.y + practiceBox.height).toBeLessThanOrEqual(devicesBox.y);
  await page.locator('#guide-practice').click();
  await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', 'throttle');
  await page.locator('#tutorial-exit').click();
  await expect(page.locator('#tutorial-coach')).toBeHidden();
});

test('the daily card names today\'s route and starts that challenge from the home screen', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#daily-card');
  await expect(card).toBeVisible();
  await expect(card.locator('#daily-card-best')).toHaveText('New route every day · separate from history');
  const start = page.locator('#daily-card-start');
  await expect(start).toBeEnabled();
  await selectLocale(page, 'zh-TW');
  await expect(start).toHaveText('挑戰');
  await expect(card.locator('h2')).toHaveText('每日挑戰');
  await selectLocale(page, 'en');
  const route = await page.locator('#daily-card-route').textContent();
  await start.click();
  await expect(page.locator('#race-status')).not.toHaveText('READY');
  const trackName = await page.locator('[data-track][aria-pressed="true"] strong').textContent();
  expect(route.startsWith(trackName)).toBe(true);
});

test('the medal chip shows the tally and opens History at the medals', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-medals', JSON.stringify({ 'first-win': '2026-10-01T00:00:00.000Z' })));
  await page.goto('/');
  const chip = page.locator('#medal-chip');
  await expect(chip).toHaveText('1/4');
  await expect(chip).toHaveAccessibleName('1 of 4 medals awarded.');
  await chip.click();
  await expect(page.locator('#history-screen')).toBeVisible();
  await expect(page.locator('#achievements-title')).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator('#history-screen')).toBeHidden();
  await expect(chip).toBeFocused();
});

for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [844, 390]]) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height }, ...(width < 761 || height < 501 ? { hasTouch: true, isMobile: true } : {}) });
    test('home entries are reachable, sized for touch and never cover Start', async ({ page }) => {
      await page.goto('/');
      const start = page.locator('#start-button');
      await expect(start).toBeVisible();
      // The intro scrolls on the smallest phones (Start already sat below the fold at 320x568).
      await start.scrollIntoViewIfNeeded();
      expect(await inViewport(page, start)).toBe(true);
      const startBox = await start.boundingBox();
      for (const selector of ['#practice-button', '.history-button', '#garage-button', '#daily-card-start']) {
        const item = page.locator(selector);
        await item.scrollIntoViewIfNeeded();
        const box = await item.boundingBox();
        expect(box.height, selector).toBeGreaterThanOrEqual(44);
        await start.scrollIntoViewIfNeeded();
        const again = await item.boundingBox();
        const now = await start.boundingBox();
        expect(again.x + again.width <= now.x || now.x + now.width <= again.x || again.y + again.height <= now.y || now.y + now.height <= again.y, `${selector} overlaps Start`).toBe(true);
      }
      expect(startBox.width).toBeGreaterThan(0);
      if (width >= 1001) {
        // Desktop keeps History on the Start row; Practice joins it.
        const [practice, history] = [await page.locator('#practice-button').boundingBox(), await page.locator('.history-button').boundingBox()];
        for (const box of [practice, history]) expect(Math.abs((startBox.y + startBox.height / 2) - (box.y + box.height / 2))).toBeLessThan(2);
      }
      expect(await page.locator('#intro').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    });

    // Compact rows may draw smaller than 44px but must still answer a 44px-tall tap (drawn box or hit area).
    test('compact touch controls still take a 44px tap', async ({ page }) => {
      test.skip(width >= 1001, 'mouse layout');
      await page.goto('/');
      await page.locator('button[data-race-mode="custom"]').evaluate(el => el.click());
      await page.locator('#race-mode-rules > summary').scrollIntoViewIfNeeded();
      const groups = ['.aero-tools > button, .aero-tools > details > summary, .aero-tools > .custom-select > button',
        '#showcase-camera-prev, #showcase-camera-next', '[data-race-mode]', '#race-mode-rules > summary'];
      for (const selector of groups) for (const control of await page.locator(selector).all()) {
        await control.scrollIntoViewIfNeeded();
        expect(await control.evaluate(el => {
          const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
          return [y - 21.5, y + 21.5].every(py => el.contains(document.elementFromPoint(x, py)));
        }), `${selector} ${await control.textContent()}`).toBe(true);
      }
      await page.locator('#settings-button').click();
      expect((await page.locator('#mute-all').boundingBox()).height).toBeGreaterThanOrEqual(44);
    });

    test('top-bar panels keep 44px taps and their selects inside the panel', async ({ page }) => {
      await page.goto('/');
      const touch = width < 1001;
      const tall = async locator => { for (const el of await locator.all()) expect((await el.boundingBox()).height, await el.getAttribute('aria-label') ?? await el.textContent()).toBeGreaterThanOrEqual(44); };
      await page.locator('#settings-button').click();
      if (touch) await tall(page.locator('#settings-panel input[type="range"]'));
      await page.keyboard.press('Escape');
      await page.locator('.aero-tools > .custom-select > button').click();
      if (touch) await tall(page.locator('.aero-tools > .custom-select [role="option"]'));
      await page.keyboard.press('Escape');
      await page.locator('#vfx-panel > summary').click();
      // A fixed-width select must never spill past the panel's padding (320px wrapped "Showcase camera").
      const spill = await page.locator('.vfx-settings').evaluate(panel => {
        const edge = panel.getBoundingClientRect().right - parseFloat(getComputedStyle(panel).paddingRight);
        return [...panel.querySelectorAll(':scope > label > .custom-select > button')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().right - edge)).filter(px => px > 1);
      });
      expect(spill).toEqual([]);
      if (touch) { await page.locator('#vfx-reset').scrollIntoViewIfNeeded(); await tall(page.locator('#vfx-reset')); }
    });
  });
}
