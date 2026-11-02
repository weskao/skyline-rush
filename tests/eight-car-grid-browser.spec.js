import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

async function closeMusic(page) {
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
}

test('eight-car Classic renders real WebGL, eight HUD rows and eight minimap markers on desktop', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await closeMusic(page);
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  await expect(page.locator('#leaderboard .racer')).toHaveCount(8, { timeout: ciTimeout(15000) });
  await expect(page.locator('#position-field-size')).toHaveText('/ 08');
  await expect(page.locator('#race-route-map [data-racer]')).toHaveCount(8);
  await page.screenshot({ path: 'test-results/race-mode-eight-car-grid-desktop.png' });
  expect(errors).toEqual([]);
});

test('Custom 2 and 8 total racers work in a real mobile race, preserving leaderboard and minimap', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await closeMusic(page);
  await page.locator('button[data-race-mode="custom"]').click();
  // Custom rules live inside a collapsed <details>; open the real UI before selecting.
  await page.locator('#race-mode-rules > summary').click();
  const rivals = page.locator('[data-race-rule="rivals"] + .custom-select');
  await rivals.getByRole('combobox').click();
  await rivals.getByRole('option', { name: '7', exact: true }).click();
  await page.locator('#start-button').scrollIntoViewIfNeeded();
  await page.locator('#start-button').click();
  await expect(page.locator('#leaderboard .racer')).toHaveCount(8, { timeout: ciTimeout(15000) });
  await expect(page.locator('#race-route-map [data-racer]')).toHaveCount(8);
  await page.screenshot({ path: 'test-results/race-mode-eight-car-grid-phone.png' });
  expect(errors).toEqual([]);
});

test('Custom two-car race runs in real portrait WebGL with one AI', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await closeMusic(page);
  await page.locator('button[data-race-mode="custom"]').click();
  // Custom rules live inside a collapsed <details>; open the real UI before selecting.
  await page.locator('#race-mode-rules > summary').click();
  const rivals = page.locator('[data-race-rule="rivals"] + .custom-select');
  await rivals.getByRole('combobox').click();
  await rivals.getByRole('option', { name: '1', exact: true }).click();
  await page.locator('#start-button').scrollIntoViewIfNeeded();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  await expect(page.locator('#leaderboard .racer')).toHaveCount(2, { timeout: ciTimeout(15000) });
  await expect(page.locator('#position-field-size')).toHaveText('/ 02');
  const markers = page.locator('#race-route-map [data-racer][visibility="visible"]');
  await expect(markers).toHaveCount(2);
  await page.screenshot({ path: 'test-results/race-mode-two-car-grid-phone.png' });
  expect(errors).toEqual([]);
});

test('Time Attack stays solo without a fabricated eight-driver HUD', async ({ page }) => {
  await page.goto('/');
  await closeMusic(page);
  await page.locator('button[data-race-mode="time"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#leaderboard')).toBeHidden();
  await expect(page.locator('#race-route-map [data-racer="NOVA"]')).toHaveAttribute('visibility', 'hidden');
});
