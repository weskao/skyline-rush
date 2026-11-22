import { ciTimeout } from './helpers/ci.js';
import { expect, test, waitForHome } from './helpers/test.js';

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`race loader follows the first rendered grid frame with motion ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize(reducedMotion === 'reduce' ? { width: 390, height: 844 } : { width: 844, height: 390 });
    await page.addInitScript(() => {
      if (!location.origin.startsWith('http')) return;
      localStorage.setItem('skyline-rush-music', 'off');
      localStorage.setItem('skyline-rush-sound', 'off');
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: true }));
    });

    let release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route('**/models/roadster2/roadster2-low.glb', async route => {
      await held;
      await route.continue();
    });

    const countdown = page.locator('#countdown');
    const rail = countdown.locator('.race-loading-rail');
    const canvas = page.locator('#world');
    const still = page.locator('#race-frame-still');
    try {
      await page.goto('/');
      await waitForHome(page);
      await page.locator('#start-button').click();
      await expect(countdown).toHaveAttribute('data-step', 'loading');
      await expect(canvas).toBeHidden();
      await expect(still).toBeVisible();
      await expect(still).toHaveAttribute('src', /track-teasers\/coast\.jpg/);
      await expect(still).toHaveCSS('object-fit', 'cover');
      await expect(rail).toBeVisible({ timeout: ciTimeout(2000) });
      await expect(countdown.locator('#countdown-number')).toBeHidden();
      const animation = () => rail.evaluate(element => getComputedStyle(element, '::after').animationName);
      await expect.poll(animation).toBe(reducedMotion === 'reduce' ? 'none' : 'startup-ignition');
      await expect(countdown.locator('#countdown-label')).toHaveText('LOADING TRACK SCENERY');
    } finally {
      release();
    }

    await expect(canvas).toBeVisible();
    await expect(still).toBeHidden();
    await expect(rail).toBeHidden();
    await expect(page.locator('#race-status')).toHaveText('RACING');
  });
}
