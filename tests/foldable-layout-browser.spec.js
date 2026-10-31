import { test, expect } from './helpers/test.js';

// This is a DOM + live WebGL integration test, not a flattened design mockup.
test.describe('dual-screen fold/unfold', () => {
  test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });

  test('hinge keeps controls reachable, custom layout saved and rotation returns to phone fallback', async ({ page }) => {
    await page.addInitScript(() => {
      window.__foldSegments = [
        { left: 0, top: 0, width: 410, height: 390 },
        { left: 434, top: 0, width: 410, height: 390 },
      ];
      Object.defineProperty(window, 'getWindowSegments', { configurable: true, value: () => window.__foldSegments });
      localStorage.setItem('skyline-rush-controls', JSON.stringify({ version: 1, mode: 'buttons', hand: 'left', size: 'M' }));
      localStorage.setItem('skyline-rush-controls-layout-v2', JSON.stringify({
        version: 2, portrait: {}, landscape: { nitro: { x: 0.5, y: 0.85 } },
      }));
      localStorage.setItem('skyline-rush-hud-mode', 'competitive');
    });
    await page.goto('/');
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('#start-button').click();
    const touch = page.locator('#touch-controls');
    await expect(touch).toHaveAttribute('data-fold-axis', 'vertical');
    await expect(page.locator('body')).toHaveAttribute('data-hud-mode', 'competitive');
    await expect(page.locator('[data-control="nitro"]')).toBeVisible();
    const controls = await touch.locator('[data-control]:visible').evaluateAll(buttons => buttons.map(b => {
      const r = b.getBoundingClientRect();
      return { name: b.dataset.control, x: r.left, y: r.top, width: r.width, height: r.height, right: r.right };
    }));
    for (const r of controls) {
      expect(r.width, r.name).toBeGreaterThanOrEqual(44);
      expect(r.height, r.name).toBeGreaterThanOrEqual(44);
      expect(r.x, r.name).toBeGreaterThanOrEqual(0);
      expect(r.right, r.name).toBeLessThanOrEqual(844);
      expect(r.right <= 410 || r.x >= 434, r.name + ' touches hinge').toBe(true);
    }
    const saved = await page.evaluate(() => localStorage.getItem('skyline-rush-controls-layout-v2'));
    await page.screenshot({ path: test.info().outputPath('foldable-inner-844x390.png'), animations: 'disabled' });
    await page.evaluate(() => { delete window.getWindowSegments; window.dispatchEvent(new Event('resize')); });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(touch).toHaveAttribute('data-fold-axis', '');
    expect(await page.evaluate(() => localStorage.getItem('skyline-rush-controls-layout-v2'))).toBe(saved);
    await expect(page.locator('[data-control="nitro"]')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('foldable-cover-390x844.png'), animations: 'disabled' });
  });

  test('pointer cancellation and capture loss never leave the steering control held', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('skyline-rush-controls', JSON.stringify({ version: 1, mode: 'buttons' })));
    await page.goto('/');
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('#start-button').click();
    const steer = page.locator('[data-control="left"]');
    await expect(steer).toBeVisible();
    await steer.evaluate(button => {
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 321, pointerType: 'touch' }));
      button.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 321, pointerType: 'touch' }));
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 322, pointerType: 'touch' }));
      button.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 322, pointerType: 'touch' }));
    });
    await expect(steer).not.toHaveClass(/is-held/);
  });
});
