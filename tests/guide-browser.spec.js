import { test, expect } from './helpers/test.js';

test.use({ guideSeen: false });

test('dismissal records the visit before navigation can interrupt the close event', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#guide-screen')).toBeVisible();
  expect(await page.evaluate(() => {
    document.querySelector('#guide-close').click();
    return localStorage.getItem('skyline-rush-guide-seen');
  })).toBe('1');
});

test('first visit shows keyboard guide; dismissal persists and Controls reopens it', async ({ page }) => {
  await page.goto('/');
  const guide = page.locator('#guide-screen');
  await expect(guide).toBeVisible();
  await expect(page.locator('#guide-desktop-panel')).toBeVisible();
  await expect(page.locator('#guide-mobile-panel')).toBeHidden();
  await expect(guide.locator('[data-keys="throttle"]')).toContainText('W');
  await expect(guide.locator('[data-keys="fly"]')).toContainText('Space');
  await expect(guide.locator('[data-i18n="guide.fly"]')).toHaveText('Hold to fly; release to land. Flight uses fuel.');
  await page.keyboard.press('Escape');
  await expect(guide).toBeHidden();
  await page.reload();
  await expect(page.locator('#start-button')).toBeVisible();
  await expect(guide).toBeHidden();
  await page.locator('#controls-button').click();
  await page.locator('#guide-open').click();
  await expect(guide).toBeVisible();
  await page.locator('[data-guide-device="mobile"]').click();
  await expect(page.locator('#guide-mobile-panel')).toBeVisible();
  await page.locator('[data-guide-device="desktop"]').click();
  await expect(page.locator('#guide-desktop-panel')).toBeVisible();
  await page.locator('#guide-close').click();
  await expect(page.locator('#controls-button')).toBeFocused();
});

test('guide follows custom key bindings and remains usable with blocked storage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-keymap', JSON.stringify({ throttle: ['KeyZ'], brake: ['KeyS'], left: ['KeyA'], right: ['KeyD'], fly: ['Space'], boost: ['ShiftLeft'], nitro: ['KeyE'] }));
  });
  await page.goto('/');
  await expect(page.locator('#guide-screen [data-keys="throttle"]')).toHaveText('Z');
  await page.locator('#guide-close').click();
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.reload();
  await expect(page.locator('#guide-screen')).toBeVisible();
  await page.locator('#guide-close').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
});

test('opening guide from paused controls does not resume the race', async ({ page }) => {
  await page.goto('/');
  await page.locator('#guide-close').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.press('Escape');
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
  await page.locator('#controls-button').click();
  await page.locator('#guide-open').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#guide-screen')).toBeHidden();
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
});
