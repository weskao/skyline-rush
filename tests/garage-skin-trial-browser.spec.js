import { test, expect } from './helpers/test.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`Trial preview and equip preserve gameplay ownership on ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    const catalog = page.locator('#garage-vfx-catalog');
    await expect(catalog).toHaveAttribute('data-preview-contract', 'live-shared-aero');
    const preview = page.locator('#garage-preview');
    await expect(preview).toHaveAttribute('data-shader-programs', /\d+/);
    const programsBefore = Number(await preview.getAttribute('data-shader-programs'));
    const ion = catalog.locator('[data-skin="thruster-ion"]');
    await expect(ion).toHaveAttribute('data-state', 'trial');
    await ion.getByRole('button', { name: /preview|預覽/i }).click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-preview-thruster', 'thruster-ion');
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster', 'thruster-basic');
    await ion.getByRole('button', { name: /try|試用/i }).click();
    await expect(ion).toHaveAttribute('data-state', 'equipped');
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster', 'thruster-ion');
    await expect(ion).toHaveAttribute('data-owned', 'false');
    await expect.poll(async () => Number(await preview.getAttribute('data-shader-programs'))).toBe(programsBefore);
    await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('data-state', 'equipped');
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    await test.info().attach(`garage-skin-trial-${viewport.width}x${viewport.height}.png`, {
      body: await page.screenshot(), contentType: 'image/png',
    });
  });
}
