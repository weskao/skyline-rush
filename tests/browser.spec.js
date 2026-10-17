import { test, expect } from '@playwright/test';

test('desktop: start, drive, steer, fly, land, pause and restart through real controls', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The road is just the beginning.' })).toBeVisible();
  await expect(page.locator('canvas#world')).toBeVisible();
  await page.getByRole('button', { name: 'Enable sound' }).click();
  await expect(page.getByRole('button', { name: 'Mute sound' })).toBeVisible();
  await page.getByRole('button', { name: 'Change camera' }).click();
  await expect(page.getByRole('button', { name: 'Change camera' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Change camera' }).click();
  await page.screenshot({ path: 'artifacts/desktop-ready.png' });
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(90);
  await page.keyboard.down('a');
  await page.waitForTimeout(250);
  await page.keyboard.up('a');
  await page.keyboard.down('Space');
  await expect(page.locator('#flight-mode')).toHaveText('FLIGHT MODE');
  await expect.poll(async () => parseFloat(await page.locator('#altitude').textContent())).toBeGreaterThan(3);
  await page.screenshot({ path: 'artifacts/desktop-flight.png' });
  await page.keyboard.up('Space');
  await expect(page.locator('#flight-mode')).toHaveText('ROAD MODE');
  await expect(page.locator('#altitude')).toHaveText('0.0');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Take a breather.' })).toBeVisible();
  const distance = await page.locator('#distance').textContent();
  await page.waitForTimeout(300);
  await expect(page.locator('#distance')).toHaveText(distance);
  await page.getByRole('region', { name: 'Take a breather.' }).getByRole('button', { name: 'Resume race' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
  await page.getByRole('region', { name: 'Take a breather.' }).getByRole('button', { name: 'Resume race' }).click();
  await page.getByRole('button', { name: 'Restart race' }).click();
  await expect(page.locator('#speed')).toHaveText('0');
  await expect(page.locator('#fuel-value')).toHaveText('100');
  await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
  expect(errors).toEqual([]);
});

test.describe('touch landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('rotating a phone keeps the driving controls visible', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start race' }).click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await expect(page.getByRole('button', { name: 'Accelerate', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hold to fly', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: 'artifacts/mobile-landscape.png' });
  });
});

test('mobile: responsive layout and pointer controls support simultaneous driving and flight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start race' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/mobile-ready.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  const throttle = page.getByRole('button', { name: 'Accelerate', exact: true });
  const fly = page.getByRole('button', { name: 'Hold to fly', exact: true });
  await throttle.dispatchEvent('pointerdown', { pointerId: 1 });
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(90);
  await fly.dispatchEvent('pointerdown', { pointerId: 2 });
  await expect(page.locator('#flight-mode')).toHaveText('FLIGHT MODE');
  await page.screenshot({ path: 'artifacts/mobile-flight.png' });
  await fly.dispatchEvent('pointercancel', { pointerId: 2 });
  await throttle.dispatchEvent('pointerup', { pointerId: 1 });
  await expect(page.locator('#flight-mode')).toHaveText('ROAD MODE');
  await expect(page.locator('#altitude')).toHaveText('0.0');
});

test('WebGL initialization failure offers an actionable error', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('WebGL');
  await expect(page.getByRole('button', { name: 'Start race' })).toBeDisabled();
});

test('a page preserved for back navigation keeps its renderer, animation and inputs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start race' })).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(30);
});

test('a complete 5 km sprint reaches results, saves a best time and can race again', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(150);
  await page.keyboard.down('a');
  await page.waitForTimeout(220);
  await page.keyboard.up('a');
  await expect(page.locator('#race-status')).toHaveText('FINISHED', { timeout: 95000 });
  await page.keyboard.up('w');
  await expect(page.locator('#distance')).toHaveText('5.00');
  await expect(page.locator('#result-stats')).toBeVisible();
  expect(await page.evaluate(() => Number(localStorage.getItem('skyline-rush-best')))).toBeGreaterThan(50);
  await page.screenshot({ path: 'artifacts/race-results.png' });
  await page.getByRole('button', { name: 'Race again' }).click();
  await expect(page.locator('#distance')).toHaveText('0.00');
  await expect(page.locator('#race-status')).toHaveText('COUNTDOWN');
});
