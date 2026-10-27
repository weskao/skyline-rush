import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { CURRENT_RELEASE, NOTES_SEEN_KEY } from '../src/release-notes.js';

// Regression: splitting the History controller may not leave browser-only
// variables unbound during bootstrap and suppress every subsequent event.
test('history controller extraction keeps game bootstrap and Start race alive', async ({ page }) => {
  test.setTimeout(ciTimeout(90000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(([notesKey, version]) => {
    localStorage.setItem('skyline-rush-guide-seen', '1');
    if (version) localStorage.setItem(notesKey, version);
  }, [NOTES_SEEN_KEY, CURRENT_RELEASE?.version]);
  await page.goto('/');
  await expect(page.locator('#start-button')).toBeEnabled();
  await expect(page.locator('#error-message')).toBeHidden();
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(45000) });
  expect(errors).toEqual([]);
});
