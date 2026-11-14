import { test, expect } from './helpers/test.js';

for (const { viewport, touch, reducedMotion } of [
  { viewport: { width: 1440, height: 900 }, touch: false, reducedMotion: 'no-preference' },
  { viewport: { width: 320, height: 640 }, touch: true, reducedMotion: 'reduce' },
  { viewport: { width: 740, height: 360 }, touch: true, reducedMotion: 'no-preference' },
]) {
  test.describe(`Garage effects at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, hasTouch: touch, reducedMotion });
    test('shares the toggle and reminds the player after equipping while hidden', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: true }));
      });
      await page.goto('/');
      await page.locator('#garage-button').click();
      const screen = page.locator('#garage-screen');
      const preview = page.locator('#garage-preview');
      const toggle = screen.getByRole('button', { name: 'Show equipment effects' });
      const loadout = page.locator('#garage-vfx-live-loadout');
      const notice = page.locator('#garage-vfx-notice');
      const activate = locator => touch ? locator.tap() : locator.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(loadout).toBeVisible();
      const bounds = await toggle.boundingBox();
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      await activate(toggle);
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(preview).toHaveAttribute('data-gpu-effects-visible', 'false');
      await expect(loadout).toBeHidden();
      await expect(preview.locator('#world')).toBeVisible();

      await activate(page.locator('#garage-studio-open'));
      await expect(screen).toHaveAttribute('data-page', 'studio');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(preview).toHaveAttribute('data-gpu-effects-visible', 'false');
      await activate(page.locator('[data-paint="crimson"]'));
      await expect(page.locator('[data-paint="crimson"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(notice).toBeEmpty();

      const skin = page.locator('[data-skin="thruster-void"]');
      await activate(skin.locator('.garage-skin-preview-hitarea'));
      await expect(skin).toHaveAttribute('data-preview-active', 'true');
      await expect(notice).toBeEmpty();
      await activate(skin.locator('.garage-skin-action'));
      await expect(preview).toHaveAttribute('data-skin-equipped-thruster', 'thruster-void');
      await expect(preview).toHaveAttribute('data-gpu-void-beams', 'false');
      await expect(notice).toContainText('Equipment applied');
      await expect(toggle).toHaveAttribute('data-reminder', 'true');
      if (reducedMotion === 'reduce') await expect(toggle.locator('.garage-vfx-pulse')).toHaveCSS('animation-name', 'none');
      await test.info().attach(`garage-effects-hidden-${viewport.width}.png`, {
        body: await screen.screenshot(), contentType: 'image/png',
      });

      await activate(toggle);
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(preview).toHaveAttribute('data-gpu-effects-visible', 'true');
      await expect(preview).toHaveAttribute('data-gpu-thruster-pattern', '3');
      if (reducedMotion !== 'reduce') await expect(preview).toHaveAttribute('data-gpu-void-beams', 'true');
      await expect(loadout).toBeVisible();
      await expect(notice).toBeEmpty();
      await test.info().attach(`garage-effects-visible-${viewport.width}.png`, {
        body: await screen.screenshot(), contentType: 'image/png',
      });
      await activate(page.locator('#garage-studio-back'));
      await expect(screen).toHaveAttribute('data-page', 'home');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await activate(toggle);
      await activate(page.locator('#garage-close'));
      await expect(screen).not.toBeVisible();
      await expect(page.locator('#world')).toBeVisible();
      await activate(page.locator('#garage-button'));
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(preview).toHaveAttribute('data-gpu-effects-visible', 'false');
      expect(errors).toEqual([]);
    });
  });
}
