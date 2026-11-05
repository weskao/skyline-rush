import { test, expect } from './helpers/test.js';

for (const pageName of ['home', 'studio']) {
  test(`Garage ${pageName} shows native-size GIF artwork highlights without replacing live 3D`, async ({ page }) => {
    await page.goto('/');
    await page.locator('#garage-button').click();
    if (pageName === 'studio') await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    const art = [
      [page.locator('.garage-paint-preview').first(), 'sparkle-paint@3x.gif'],
      [page.locator('.garage-vfx-art').first(), 'sparkle@3x.gif'],
      [page.locator('#garage-vfx-art-badges .garage-badge-art-frame').first(), 'sparkle-badges@3x.gif'],
    ];
    for (const [node, name] of art) {
      await node.scrollIntoViewIfNeeded();
      await expect(node).toBeVisible();
      const image = await node.evaluate(el => getComputedStyle(el, '::after').backgroundImage);
      expect(image).toContain('garage-animated/' + name);
    }
    await expect(page.locator('#garage-preview #world')).toBeVisible();
  });
}

test('GIF overlays are suppressed when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#garage-button').click();
  const selectors = ['.garage-paint-preview', '.garage-vfx-art', '#garage-vfx-art-badges .garage-badge-art-frame'];
  for (const selector of selectors) {
    const node = page.locator(selector).first();
    await node.scrollIntoViewIfNeeded();
    expect(await node.evaluate(el => getComputedStyle(el, '::after').backgroundImage)).toBe('none');
  }
});
