import { test, expect } from './helpers/test.js';

test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });

async function touchstartCancelled(page, selector) {
  return page.locator(selector).first().evaluate(element => {
    const event = new Event('touchstart', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'touches', { value: [{}] });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

test('game surfaces suppress iPhone long-press loupe without canceling UI button taps', async ({ page }) => {
  await page.goto('/');
  expect(await touchstartCancelled(page, '#world')).toBe(true);
  // Noninteractive HUD text is safe to cancel; the scrollable intro must retain native panning.
  expect(await touchstartCancelled(page, '#speed')).toBe(true);
  expect(await touchstartCancelled(page, '#start-button')).toBe(false);
  expect(await touchstartCancelled(page, '#controls-button')).toBe(false);
  await page.locator('#controls-button').tap();
  await expect(page.locator('#controls-panel')).toBeVisible();
});

test('scrollable settings content keeps native touch scrolling and close button works', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settings-button').tap();
  await expect(page.locator('#settings-panel')).toBeVisible();
  expect(await touchstartCancelled(page, '#settings-button')).toBe(false);
  await page.locator('#settings-button').tap();
  await expect(page.locator('#settings-panel')).toBeHidden();
});
