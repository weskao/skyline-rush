import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { CURRENT_RELEASE, NOTES_SEEN_KEY } from '../src/release-notes.js';

// A returning-player bootstrap test alone misses first-start's guide -> practice -> race path.
for (const [width, height, touch] of [[1440, 900, false], [390, 844, true]]) {
  test.describe(`fresh visitor game start ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    test('Start works on fresh storage and after practice exit', async ({ page }) => {
      test.setTimeout(ciTimeout(90000));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // No guide-seen flag: test the actual first-visit path instead of bypassing it.
      await page.addInitScript(([key, version]) => {
        localStorage.removeItem('skyline-rush-guide-seen');
        if (version) localStorage.setItem(key, version);
      }, [NOTES_SEEN_KEY, CURRENT_RELEASE?.version]);
      await page.goto('/');
      await expect(page.locator('#error-message')).toBeHidden();
      await expect(page.locator('#start-button')).toBeVisible();
      await expect(page.locator('#start-button')).toBeEnabled();
      await page.locator('#start-button').click();
      await expect(page.locator('#tutorial-coach')).toBeVisible();
      await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', 'throttle');
      await page.locator('#tutorial-exit').click();
      await expect(page.locator('#tutorial-coach')).toBeHidden();
      await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(45000) });
      expect(errors).toEqual([]);
    });
  });
}
