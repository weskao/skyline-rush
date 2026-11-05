import { test, expect } from './helpers/test.js';

for (const pageName of ['home', 'studio']) {
  test(`Garage ${pageName} shows looping GIF overlays without replacing the live 3D showroom`, async ({ page }) => {
    await page.goto('/');
    await page.locator('#garage-button').click();
    if (pageName === 'studio') await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    const art = [
      page.locator('.garage-paint-preview').first(),
      page.locator('.garage-vfx-art').first(),
      page.locator('#garage-vfx-art-badges .garage-badge-art-frame').first(),
    ];
    for (const node of art) {
      await node.scrollIntoViewIfNeeded();
      await expect(node).toBeVisible();
      const image = await node.evaluate(el => getComputedStyle(el, '::after').backgroundImage);
      expect(image).toMatch(/garage-animated\/sparkle@3x\.gif/);
    }
    await expect(page.locator('#garage-preview #world')).toBeVisible();
  });
}

test('GIF overlays are suppressed when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#garage-button').click();
  const nodes = ['.garage-paint-preview', '.garage-vfx-art', '#garage-vfx-art-badges .garage-badge-art-frame'];
  for (const selector of nodes) {
    const node = page.locator(selector).first();
    await node.scrollIntoViewIfNeeded();
    expect(await node.evaluate(el => getComputedStyle(el, '::after').backgroundImage)).toBe('none');
  }
});
