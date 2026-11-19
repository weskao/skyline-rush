import { expect } from '@playwright/test';
import { test } from './helpers/test.js';
import { recordPaint, firstPaint } from './helpers/boot-paint.js';

// Building the 3D world is one long task (seconds on CPU-only WebGL). Home's race setup is in the DOM before it
// starts, so a frame must reach the screen between the two, or the player stares at a blank page until the world
// is built (race-modes, home-shortcuts and device-quality boot budgets, CI 44399876486).
test('Home setup reaches a frame before the 3D world is built', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-music', 'off');
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (this.id === 'world' && /webgl/.test(type)) window.__worldAt ??= performance.now();
      return getContext.call(this, type, ...rest);
    };
  });
  await recordPaint(page, '.route-drivers');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const framedAt = await firstPaint(page, '.route-drivers');
  await expect.poll(() => page.evaluate(() => typeof window.__worldAt)).toBe('number');
  expect(framedAt).toBeLessThan(await page.evaluate(() => window.__worldAt)); // settled: polled above, written once
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
});

// Home's first showTracks() runs before the world exists, so a Coming Soon card can only show its cover image then.
// Once the world is built the card must switch to the live 3D showroom (frostbite-canyon, CI 44468157574).
test('a Coming Soon card opened at boot switches to live 3D once the world is built', async ({ page }) => {
  await page.goto('/?stage2-preview=frostbite-canyon');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('#start-button span')).toHaveText('COMING SOON');
  await expect(page.locator('#upcoming-scene')).toBeHidden(); // live 3D, not the cover image
});
