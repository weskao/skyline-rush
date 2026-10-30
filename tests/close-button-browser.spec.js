import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// Every panel closes with the same round × (src/CloseButton.vue), named for screen readers, closed by a real tap.
const PANELS = [
  ['History', '.history-button', '#history-screen', '#history-close', 'Close history'],
  ['Garage', '#garage-button', '#garage-screen', '#garage-close', 'Close garage'],
  ["What's new", '#whats-new-open', '#whats-new-screen', '#release-close', "Close what's new"],
  ['Event Lab', 'button[data-race-mode="eventlab"]', '#event-lab-dialog', '#lab-close', 'Close'],
];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: viewport.width < 600 });
    test('every panel closes with the same named round × button', async ({ gameplayPage: page }) => {
      for (const [name, opener, panel, close, label] of PANELS) {
        await page.locator(opener).click();
        await expect(page.locator(panel), name).toBeVisible();
        const button = page.locator(close);
        await expect(button, name).toHaveText('×');
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
