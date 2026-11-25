import { toggleSettingsSection } from './helpers/settings-browser.js';
import { test, expect } from './helpers/test.js';

const open = async page => {
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};

test.describe('single-thumb actions', () => {
  test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });
  test('slide across FLY/BOOST activates AIR DASH and cancellation releases both', async ({ page, context }) => {
    await open(page);
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(90);
    const fly = await page.locator('[data-control="fly"]').boundingBox();
    const boost = await page.locator('[data-control="boost"]').boundingBox();
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: fly.x + fly.width / 2, y: fly.y + fly.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: (boost.x + boost.width + fly.x) / 2, y: fly.y + fly.height / 2 }] });
    await expect(page.locator('[data-control="fly"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-control="boost"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#flight-state')).toHaveText('AIR DASH');
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.locator('[data-control="fly"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-control="boost"]')).toHaveAttribute('aria-pressed', 'false');
  });
});

// The browser's real 2.5s no-reading fallback must not race the Playwright transport.
// Record the actual waiting state and feed a simulated reading from the page itself.
const armTiltReading = (page, gamma) => page.evaluate(gamma => {
  const status = document.querySelector('#tilt-status');
  window.tiltWaitingObserved = false;
  const observer = new MutationObserver(() => {
    if (!status.textContent.includes('Waiting for tilt readings')) return;
    observer.disconnect();
    window.tiltWaitingObserved = true;
    if (gamma !== null) window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { gamma, beta: 20 }));
  });
  observer.observe(status, { childList: true, characterData: true, subtree: true });
}, gamma);

test.describe('tilt', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('permission is requested only by selection; denied permission keeps Slide available', async ({ page }) => {
    await page.addInitScript(() => {
      window.permissionRequests = 0;
      DeviceOrientationEvent.requestPermission = async () => { window.permissionRequests++; return 'denied'; };
    });
    await open(page);
    await toggleSettingsSection(page, 'driving');
    expect(await page.evaluate(() => window.permissionRequests)).toBe(0); // settled: an absence check; opening the panel must not have asked
    await page.locator('[data-controls="mode"][value="tilt"]').click();
    await expect(page.locator('#tilt-status')).toContainText('denied');
    await expect(page.locator('[data-controls="mode"][value="slide"]')).toBeChecked();
    expect(await page.evaluate(() => window.permissionRequests)).toBe(1);
  });

  test('granted tilt without sensor readings falls back to Slide', async ({ page }) => {
    await page.addInitScript(() => { DeviceOrientationEvent.requestPermission = async () => 'granted'; });
    await open(page);
    await toggleSettingsSection(page, 'driving');
    await armTiltReading(page, null);
    await page.locator('[data-controls="mode"][value="tilt"]').click();
    await expect.poll(() => page.evaluate(() => window.tiltWaitingObserved)).toBe(true);
    await expect(page.locator('[data-controls="mode"][value="slide"]')).toBeChecked();
    await expect(page.locator('#tilt-enable')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')).mode)).toBe('slide');
  });

  test('granted tilt calibrates and steers the real car; reopening calibration and resetting remain usable', async ({ page }) => {
    await page.addInitScript(() => { DeviceOrientationEvent.requestPermission = async () => 'granted'; });
    await open(page);
    await toggleSettingsSection(page, 'driving');
    await armTiltReading(page, 5);
    const tilt = page.locator('[data-controls="mode"][value="tilt"]');
    await tilt.click();
    await expect(page.locator('#tilt-status')).toContainText('ready');
    await expect(tilt).toBeChecked();
    expect(await page.evaluate(() => window.tiltWaitingObserved)).toBe(true);
    await toggleSettingsSection(page, 'driving');
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await page.evaluate(() => {
      window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { gamma: 5, beta: 20 }));
      window.tiltInterval = setInterval(() => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { gamma: 20, beta: 20 })), 50);
    });
    await expect.poll(() => page.evaluate(() => parseFloat(document.body.style.getPropertyValue('--flight-bank')))).toBeLessThan(-2);
    await page.evaluate(() => clearInterval(window.tiltInterval));
    await page.locator('#pause-button').click();
    await toggleSettingsSection(page, 'driving');
    await armTiltReading(page, 20);
    await page.locator('#tilt-enable').click();
    await expect(page.locator('#tilt-status')).toContainText('ready');
    await expect(tilt).toBeChecked();
    expect(await page.evaluate(() => window.tiltWaitingObserved)).toBe(true);
    await page.locator('#controls-reset').click();
    await expect(page.locator('[data-controls="mode"][value="slide"]')).toBeChecked();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')).mode)).toBe('slide');
  });
});
