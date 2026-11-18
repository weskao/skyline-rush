import { clickLobbyOption } from './helpers/home-lobby.js';
import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';

// The worker-scoped unlockedAccess fixture defaults to false in this file.
test.describe('Skyfall release lock', () => {
  test('production card remains Coming Soon and START is disabled', async ({ gameplayPage: page }) => {
    await clickLobbyOption(page, '[data-upcoming-track="skyfall-archipelago"]');
    await expect(page.locator('#start-button')).toBeDisabled();
  });
});
