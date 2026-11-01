import { test, expect } from './helpers/test.js';

// Both Garage pages must show the real player car with live, selectable Aero VFX.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`Garage Home and Studio preview every effect on the car at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const screen = page.locator('#garage-screen');
    const preview = page.locator('#garage-preview');
    const catalog = page.locator('#garage-vfx-catalog');
    const car = page.locator('#garage-preview #world');
    await expect(screen).toHaveAttribute('data-page', 'home');
    await expect(catalog).toBeVisible();
    await expect(car).toBeVisible();

    const voidSkin = catalog.locator('[data-skin="thruster-void"]');
    await voidSkin.getByRole('button', { name: /preview|預覽/i }).click();
    await expect(preview).toHaveAttribute('data-skin-preview-thruster', 'thruster-void');
    await expect(preview).toHaveAttribute('data-skin-equipped-thruster', 'thruster-basic');
    await expect(preview).toHaveAttribute('data-gpu-void-beams', 'true');
    await expect(voidSkin).toHaveAttribute('data-preview-active', 'true');
    await test.info().attach(`garage-void-home-${viewport.width}x${viewport.height}.png`, {
      body: await car.screenshot(), contentType: 'image/png',
    });

    await page.locator('#garage-studio-open').click();
    await expect(screen).toHaveAttribute('data-page', 'studio');
    await expect(preview).toHaveAttribute('data-gpu-void-beams', 'true');

    for (const [skin, pattern] of [
      ['launch-flare-ring', '2'], ['launch-flare-pulse', '3'],
    ]) {
      const option = catalog.locator(`[data-skin="${skin}"]`);
      await option.getByRole('button', { name: /preview|預覽/i }).click();
      await expect(option).toHaveAttribute('data-preview-active', 'true');
      await expect(preview).toHaveAttribute('data-gpu-launch-pattern', pattern);
      await expect(preview).toHaveAttribute('data-launch-preview-active', 'true');
      await expect(preview).toHaveAttribute('data-skin-equipped-launch-flare', 'launch-flare-basic');
      await test.info().attach(`garage-${skin}-studio-${viewport.width}x${viewport.height}.png`, {
        body: await car.screenshot(), contentType: 'image/png',
      });
    }

    await page.locator('#garage-studio-back').click();
    await expect(screen).toHaveAttribute('data-page', 'home');
    await expect(preview).toHaveAttribute('data-skin-preview-launch-flare', 'launch-flare-pulse');
    await page.locator('#garage-close').click();
    await page.locator('#garage-button').click();
    await expect(preview).toHaveAttribute('data-skin-preview-launch-flare', 'launch-flare-basic');
  });
}

test('all 16 cosmetics drive distinct GPU patterns in the live Preview Studio', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const cases = [
    { category: 'thruster', field: 'data-gpu-thruster-pattern', skins: ['thruster-basic', 'thruster-ion', 'thruster-plasma', 'thruster-void'] },
    { category: 'airflow', field: 'data-gpu-airflow-pattern', skins: ['airflow-basic', 'airflow-slipstream', 'airflow-vortex', 'airflow-prism'] },
    { category: 'nitro-trail', field: 'data-gpu-trail-pattern', skins: ['nitro-trail-basic', 'nitro-trail-cyan', 'nitro-trail-gold', 'nitro-trail-red'] },
    { category: 'launch-flare', field: 'data-gpu-launch-pattern', skins: ['launch-flare-basic', 'launch-flare-blue', 'launch-flare-ring', 'launch-flare-pulse'] },
  ];
  const preview = page.locator('#garage-preview');
  for (const { category, field, skins } of cases) {
    for (const [mode, skin] of skins.entries()) {
      const card = page.locator(`#garage-vfx-catalog [data-skin="${skin}"]`);
      await card.getByRole('button', { name: /preview|預覽/i }).click();
      await expect(preview).toHaveAttribute(field, String(mode));
      await expect(preview).toHaveAttribute(`data-skin-preview-${category}`, skin);
      await expect(card).toHaveAttribute('data-preview-active', 'true');
      await expect(preview).toHaveAttribute(`data-skin-equipped-${category}`, skins[0]);
    }
  }
});

test('new original Gold/Crimson/Cyan/Magenta/White launch flares and Purple trail all preview on vehicle', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const cases = [
    ['nitro-trail-purple', 'data-gpu-trail-pattern', '4'],
    ['launch-flare-gold', 'data-gpu-launch-pattern', '4'],
    ['launch-flare-red', 'data-gpu-launch-pattern', '5'],
    ['launch-flare-cyan', 'data-gpu-launch-pattern', '6'],
    ['launch-flare-magenta', 'data-gpu-launch-pattern', '7'],
    ['launch-flare-white', 'data-gpu-launch-pattern', '8'],
  ];
  const preview = page.locator('#garage-preview');
  for (const [id, name, mode] of cases) {
    await page.locator(`[data-skin="${id}"]`).getByRole('button', { name: /preview|預覽/i }).click();
    await expect(preview).toHaveAttribute(name, mode);
    await expect(page.locator(`[data-skin="${id}"]`)).toHaveAttribute('data-preview-active', 'true');
    const img = page.locator(`[data-skin="${id}"] img`);
    await expect(img).toHaveJSProperty('naturalWidth', 288);
    if (id.startsWith('launch-flare-')) await expect(preview).toHaveAttribute('data-launch-preview-active', 'true');
  }
});
