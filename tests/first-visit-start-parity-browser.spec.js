import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

test.use({ guideSeen: false });

for (const [width, height, touch] of [[1440, 900, false], [390, 844, true], [844, 390, true]]) {
  test.describe(`fresh visitor game start ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    test('first Start offers a choice and directly races the selected mode and track', async ({ page }, testInfo) => {
      await page.addInitScript(() => localStorage.setItem('skyline-rush-unlocked', '["coast","neon"]'));
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.locator('[data-track="neon"]').click();
      await page.locator('[data-race-mode="time"]').click();
      await page.locator('#start-button').click();
      const guide = page.locator('#guide-screen');
      await expect(guide).toBeVisible();
      await expect(page.locator('#tutorial-coach')).toBeHidden();
      const firstScreen = guide.locator('#guide-quick');
      await expect(firstScreen).toBeInViewport({ ratio: 1 });
      await expect(firstScreen.locator('li')).toHaveCount(4);
      await expect(guide.locator('#guide-practice')).toHaveText('Practice first');
      await expect(guide.locator('#guide-start-race')).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: testInfo.outputPath('first-start.png'), scale: 'css' });
      await guide.locator('#guide-start-race').click();
      await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(12000) });
      await expect(page.locator('body')).toHaveAttribute('data-race-mode', 'time');
      await expect(page.locator('#race-route-map')).toHaveAttribute('data-theme', 'neon');
      await expect(page.locator('#tutorial-coach')).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem('skyline-rush-guide-seen'))).toBe('1');
    });
  });
}

test('closing the first choice and returning from practice keep the selected race ready', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-unlocked', '["coast","neon"]'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-track="neon"]').click();
  await page.locator('[data-race-mode="time"]').click();
  await page.locator('#start-button').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#start-button')).toBeFocused();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  expect(await page.evaluate(() => localStorage.getItem('skyline-rush-guide-seen'))).toBeNull();
  await page.locator('#start-button').click();
  await page.locator('#guide-practice').click();
  await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', 'throttle');
  await page.locator('.brand').click();
  await page.locator('#leave-home').click();
  await expect(page.locator('#tutorial-coach')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('[data-track="neon"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-race-mode="time"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(12000) });
});

test('old guide and completed-practice records both bypass first-start choice', async ({ browser, baseURL }) => {
  for (const key of ['skyline-rush-guide-seen', 'skyline-rush-tutorial-completed']) {
    const page = await browser.newPage({ baseURL });
    try {
      await page.addInitScript(key => {
        localStorage.setItem(key, '1');
        localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0');
      }, key);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.locator('#start-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
      await expect(page.locator('#guide-screen')).toBeHidden();
      await expect(page.locator('#tutorial-coach')).toBeHidden();
    } finally {
      await page.close();
    }
  }
});
