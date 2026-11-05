import { test, expect } from './helpers/test.js';

for (const pageName of ['home', 'studio']) {
  test(`Garage ${pageName} uses source-art animation without replacing live 3D`, async ({ page }) => {
    await page.goto('/');
    await page.locator('#garage-button').click();
    if (pageName === 'studio') await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    for (const [selector, name, px] of [
      ['[data-skin="thruster-basic"] .garage-vfx-art img', 'thruster-basic', 288],
      ['#garage-vfx-art-badges .garage-badge-art-frame img', 'badge-equipped', 216],
    ]) {
      const image = page.locator(selector).first();
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute('data-animation-active', 'true');
      await expect(image).toHaveAttribute('src', new RegExp('garage-animated/' + name + '@3x\\.gif$'));
      await expect(image).toHaveJSProperty('naturalWidth', px);
      await expect(image).toHaveJSProperty('naturalHeight', px);
      await expect(image).toHaveAttribute('data-static-src', /raster\//);
    }
    await expect(page.locator('#garage-preview #world')).toBeVisible();
  });
}

test('Garage store concepts animate each original gift box while retaining original fallback', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const source = page.locator('#garage-art-source-garage-store-readiness');
  await source.locator('summary').click();
  const box = source.locator('[data-wave3-asset="store-box"] img');
  await box.scrollIntoViewIfNeeded();
  await expect(box).toHaveAttribute('data-animation-active', 'true');
  await expect(box).toHaveAttribute('src', /garage-animated\/store-box@3x\.gif$/);
  await expect(box).toHaveJSProperty('naturalWidth', 216);
  await expect(box).toHaveAttribute('data-static-src', /garage-store-readiness\/raster\/store-box@3x\.webp$/);
});

test('reduced-motion displays untouched original static assets, never animating GIF', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#garage-button').click();
  const icon = page.locator('[data-skin="thruster-basic"] .garage-vfx-art img');
  await icon.scrollIntoViewIfNeeded();
  await expect(icon).toHaveAttribute('data-animation-active', 'false');
  await expect(icon).toHaveAttribute('src', /raster\/thruster-basic@3x\.webp$/);
  await expect(icon).toHaveJSProperty('naturalWidth', 288);
});

test('failed GIF falls back to source WebP without changing equipped state', async ({ page }) => {
  await page.route('**/garage-animated/thruster-ion@3x.gif', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  const skin = page.locator('[data-skin="thruster-ion"]');
  const icon = skin.locator('img');
  await icon.scrollIntoViewIfNeeded();
  await expect(icon).toHaveAttribute('data-animation-active', 'false');
  await expect(icon).toHaveAttribute('src', /raster\/thruster-ion@3x\.webp$/);
  await expect(skin).toHaveAttribute('data-owned', 'false');
});
