import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// 13C Responsive (TODO 1788): at every supported size, an open setup dialog keeps Tab/Shift+Tab inside and hands
// focus back to its opener, a setup popover never strands focus, and the in-race End action is reachable by pointer.
const VIEWPORTS = [[1440, 900], [390, 844], [320, 740], [844, 390]];
// Where focus is: inside the dialog, on the browser's own UI (a native modal hands Tab past its last control to the
// address bar, which leaves document.activeElement on <body>), or on a page control outside the dialog (escaped).
const focusPlace = (page, selector) => page.evaluate(sel => {
  const el = document.activeElement;
  if (document.querySelector(sel).contains(el)) return 'inside';
  return !el || el === document.body ? 'browser' : `escaped to ${el.tagName}#${el.id}.${el.getAttribute('class') ?? ''}`;
}, selector);

// Walks twice the dialog's tab stops each way: focus never reaches the page behind, and it keeps coming back inside.
async function assertTrapped(page, selector) {
  const stops = await page.locator(`${selector} :is(a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])):visible`).count();
  expect(stops, `${selector} has focusable controls`).toBeGreaterThan(0);
  for (const key of ['Tab', 'Shift+Tab']) {
    const places = [];
    for (let i = 0; i < stops * 2 + 4; i++) { await page.keyboard.press(key); places.push(await focusPlace(page, selector)); }
    expect(places.filter(place => place.startsWith('escaped')), `${key} never focuses the page behind ${selector}`).toEqual([]);
    expect(places.filter(place => place === 'inside').length, `${key} cycles back into ${selector}`).toBeGreaterThan(stops * 2);
  }
}
const fullyVisible = (box, width, height) => box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height;

for (const [width, height] of VIEWPORTS) test.describe(`${width}x${height}`, () => {
  const phone = width < 900;
  test.use({ viewport: { width, height }, hasTouch: phone, isMobile: phone });

  test('the Event Lab setup dialog traps Tab and returns focus to its mode button', async ({ gameplayPage: page }) => {
    const opener = page.locator('button[data-race-mode="eventlab"]');
    for (const close of ['Escape', 'button']) {
      await opener.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#event-lab-dialog')).toBeVisible();
      await assertTrapped(page, '#event-lab-dialog');
      if (close === 'Escape') await page.keyboard.press('Escape');
      else await page.locator('#lab-close').click();
      await expect(page.locator('#event-lab-dialog')).toBeHidden();
      await expect(opener, `closing by ${close} returns focus to the opener`).toBeFocused();
    }
  });

  test('a setup popover keeps focus on its combobox and never stays open behind it', async ({ gameplayPage: page }) => {
    await page.locator('button[data-race-mode="custom"]').click();
    const rules = page.locator('#race-mode-rules');
    if (!await rules.evaluate(details => details.open)) await rules.locator('> summary').click();
    const combo = page.locator('#race-rules-row [role="combobox"]:visible').first();
    await combo.focus();
    await page.keyboard.press('ArrowDown');
    const list = page.locator(`#${await combo.getAttribute('aria-controls')}`);
    await expect(list).toBeVisible();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await expect(combo, 'arrows move the highlight, not focus').toBeFocused();
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(combo, 'Escape returns to the opener').toBeFocused();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await page.keyboard.press('ArrowDown');
    await expect(list).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(list, 'Tab moves on and closes the list').toBeHidden();
    await page.keyboard.press('Shift+Tab');
    await expect(combo).toBeFocused();
  });

  test('from the pause menu, the leave dialog traps focus, returns it, and End race works with a real pointer click', async ({ gameplayPage: page }) => {
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
    await page.locator('#pause-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
    // The pause menu's way out: the brand link must be on screen and on top, even on the narrowest phone.
    const brand = page.locator('.brand'), brandBox = await brand.boundingBox();
    expect(fullyVisible(brandBox, width, height), `the brand (leave race) is on screen while paused: ${JSON.stringify(brandBox)}`).toBe(true);
    expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.brand'),
      { x: brandBox.x + brandBox.width / 2, y: brandBox.y + brandBox.height / 2 }), 'nothing covers the brand').toBe(true);
    await brand.focus();
    await page.keyboard.press('Enter');
    const leave = page.locator('#leave-screen');
    await expect(leave).toBeVisible();
    await assertTrapped(page, '#leave-screen');
    await page.locator('#leave-keep').focus(); // the walk may end on the browser's own UI, whose keys never reach the page
    await page.keyboard.press('Escape');
    await expect(leave).toBeHidden();
    await expect(brand, 'Escape returns focus to the brand link that opened it').toBeFocused();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');

    await page.mouse.click(brandBox.x + brandBox.width / 2, brandBox.y + brandBox.height / 2);
    await expect(leave).toBeVisible();
    const end = page.locator('#leave-end'), box = await end.boundingBox();
    expect(fullyVisible(box, width, height), `End race fully on screen: ${JSON.stringify(box)}`).toBe(true);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await expect(leave).toBeHidden();
  });
});
