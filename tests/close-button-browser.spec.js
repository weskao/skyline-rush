import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { clickLobbyOption } from './helpers/home-lobby.js';

// Shared round close control, including Garage's illustrated ×.
const PANELS = [
  ['History', '.history-button', '#history-screen', '#history-close', 'Close history'],
  ['Garage', '#garage-button', '#garage-screen', '#garage-close', 'Close garage'],
  ["What's new", '#whats-new-open', '#whats-new-screen', '#release-close', "Close what's new"],
  ['Event Lab', 'button[data-race-mode="eventlab"]', '#event-lab-dialog', '#lab-close', 'Close Event Lab'],
];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: viewport.width < 600 });
    test('every panel closes with the same named round × button', async ({ gameplayPage: page }) => {
      for (const [name, opener, panel, close, label] of PANELS) {
        await clickLobbyOption(page, opener); // phones keep the mode list behind the Mode dropdown
        await expect(page.locator(panel), name).toBeVisible();
        const button = page.locator(close);
        if (name === 'Garage') {
          await expect(button.locator('img[data-collectible-icon="close"]')).toHaveJSProperty('naturalWidth', 72);
        } else {
          await expect(button, name).toHaveText('×');
        }
        await expect(button, name).toHaveAccessibleName(label);
        const shape = await button.evaluate(el => { const s = getComputedStyle(el); return { w: el.offsetWidth, h: el.offsetHeight, radius: s.borderRadius }; });
        expect(shape, name).toEqual({ w: 44, h: 44, radius: '50%' });
        await page.screenshot({ path: test.info().outputPath(`${close.slice(1)}.png`) });
        await button.click();
        await expect(page.locator(panel), `${name} closes`).toBeHidden();
      }
    });
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe('Event Lab shared removal cross ' + viewport.width + 'x' + viewport.height, () => {
    test.use({ viewport, hasTouch: viewport.width < 600 });
    test('the remove cross matches Garage, removes an object, and keeps the editor open', async ({ gameplayPage: page }) => {
      await clickLobbyOption(page, 'button[data-race-mode="eventlab"]');
      const lab = page.locator('#event-lab-dialog');
      await expect(lab).toBeVisible();
      const objectTab = lab.locator('.lab-switch button').nth(1);
      if (await objectTab.isVisible()) await objectTab.click();
      const rows = lab.locator('#lab-objects > li');
      const count = await rows.count();
      expect(count).toBeGreaterThan(1);
      const remove = rows.last().locator('button.close-button');
      await expect(remove).toHaveAttribute('aria-label', /\S/);
      const shape = await remove.evaluate(el => {
        const style = getComputedStyle(el);
        return { width: el.offsetWidth, height: el.offsetHeight, radius: style.borderRadius };
      });
      expect(shape).toEqual({ width: 44, height: 44, radius: '50%' });
      await remove.click();
      await expect(rows).toHaveCount(count - 1);
      await expect(lab).toBeVisible();
    });
  });
}
