import { expect } from '@playwright/test';
import { test } from './helpers/test.js';

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
    new MutationObserver((_, observer) => {
      if (!document.querySelector('.route-drivers')?.textContent) return;
      observer.disconnect();
      requestAnimationFrame(() => { window.__framedAt = performance.now(); });
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => [typeof window.__framedAt, typeof window.__worldAt])).toEqual(['number', 'number']);
  const { framedAt, worldAt } = await page.evaluate(() => ({ framedAt: window.__framedAt, worldAt: window.__worldAt })); // settled: both polled above
  expect(framedAt).toBeLessThan(worldAt);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
});
