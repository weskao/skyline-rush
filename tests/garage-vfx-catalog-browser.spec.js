import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`Phase A skins catalog is read-only, bilingual and preserves PAINTS on ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    const catalog = page.locator('#garage-vfx-catalog');
    await expect(catalog).toBeVisible();
    await expect(catalog).toHaveAttribute('data-preview-contract', 'contract-only');
    await expect(catalog.locator('[data-skin]')).toHaveCount(8);
    await expect(catalog.getByRole('button')).toHaveCount(0);
    await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('data-state', 'equipped');
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    const screenshot = await page.screenshot();
    await test.info().attach(`garage-skins-phasea-${viewport.width}x${viewport.height}.png`, { body: screenshot, contentType: 'image/png' });
  });
}

test('missing SVG artwork shows a text fallback and never unlocks a skin', async ({ page }) => {
  await page.route('**/feature-assets/garage-vfx-skins/thruster.svg', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const ion = page.locator('[data-skin="thruster-ion"]');
  await expect(ion.locator('.garage-vfx-fallback')).toBeVisible();
  await expect(ion).toHaveAttribute('data-state', 'locked');
  await expect(page.locator('#garage-equip')).toBeDisabled();
});

test('skins catalog copies switch between English and Traditional Chinese', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('#garage-vfx-catalog-heading')).toHaveText('外觀特效收藏');
  await expect(page.locator('[data-skin="thruster-ion"]')).toContainText('離子推進器');
  await page.locator('#garage-close').click();
  await selectLocale(page, 'en');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('#garage-vfx-catalog-heading')).toHaveText('VFX collection');
  await expect(page.locator('[data-skin="thruster-ion"]')).toContainText('Ion thruster');
});
