import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';

// The worker-scoped unlockedAccess fixture defaults to false in this file.
test.describe('Skyfall release lock', () => {
  test('production card remains Coming Soon and START is disabled', async ({ gameplayPage: page }) => {
    await page.locator('[data-upcoming-track="skyfall-archipelago"]').click();
    await expect(page.locator('#start-button')).toBeDisabled();
  });
});
