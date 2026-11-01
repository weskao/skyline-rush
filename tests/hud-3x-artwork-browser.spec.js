import { test, expect } from './helpers/test.js';
test('all 18 3x original HUD/control images are accessible at 1x CSS in Settings', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settings-button').click();
  const gallery = page.locator('#hud-3x-source-gallery');
  await expect(gallery).toBeVisible();
  await gallery.locator('summary').click();
  const icons = gallery.locator('img');
  await expect(icons).toHaveCount(18);
  const wide = gallery.locator('img[data-image="button-back"]');
  const small = gallery.locator('img[data-image="hud-brake"]');
  await wide.scrollIntoViewIfNeeded();
  await expect(wide).toHaveAttribute('width', '144');
  await expect(wide).toHaveAttribute('height', '52');
  await expect(wide).toHaveJSProperty('naturalWidth', 432);
  await small.scrollIntoViewIfNeeded();
  await expect(small).toHaveAttribute('width', '72');
  await expect(small).toHaveAttribute('height', '72');
  await expect(small).toHaveJSProperty('naturalWidth', 216);
  await expect(page.locator('#touch-controls')).toBeHidden();
  await expect(gallery).not.toContainText(/enable purchase|claim reward|立即購買/i);
});

test('original 3x images decorate functional Nitro, Brake, Pause and Play buttons without stealing input', async ({ page }) => {
  await page.goto('/');
  for (const [selector, filename, cssWidth] of [
    ['#start-button', 'button-play', '144'],
    ['#garage-button', 'button-garage', '144'],
    ['#pause-button', 'hud-pause', '72'],
    ['[data-control="nitro"]', 'button-nitro', '144'],
    ['[data-control="brake"]', 'hud-brake', '72'],
    ['[data-control="left"]', 'ui-arrow-left', '72'],
    ['[data-control="right"]', 'ui-arrow-right', '72'],
  ]) {
    const image = page.locator(selector + ' img.hud-3x-decor');
    await expect(image).toHaveAttribute('src', new RegExp(filename + '@3x\\.webp$'));
    await expect(image).toHaveAttribute('width', cssWidth);
    await expect(image).toHaveAttribute('aria-hidden', 'true');
    await expect(image).toHaveCSS('pointer-events', 'none');
  }
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen')).toBeVisible();
});
