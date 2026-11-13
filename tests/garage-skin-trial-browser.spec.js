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

test('VFX requires preview before confirmation and returns to the equipped effect when closed', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: true })));
  await page.goto('/');
  await page.locator('#garage-button').click();
  const showroom = page.locator('#garage-preview');
  const ion = page.locator('[data-skin="thruster-ion"]');
  const action = ion.locator('.garage-skin-action');
  await expect(action).toBeDisabled();
  await ion.locator('.garage-skin-preview-hitarea').click();
  await expect(action).toBeEnabled();
  await expect(showroom).toHaveAttribute('data-skin-preview-thruster', 'thruster-ion');
  await expect(showroom).toHaveAttribute('data-skin-equipped-thruster', 'thruster-basic');
  await page.locator('#garage-close').click();
  await expect(page.locator('#garage-screen')).toBeHidden();

  await page.locator('#garage-button').click();
  await expect(showroom).toHaveAttribute('data-skin-preview-thruster', 'thruster-basic');
  await expect(action).toBeDisabled();
  await ion.locator('.garage-skin-preview-hitarea').click();
  await action.click();
  await expect(action).toHaveText('Trial active');
  await expect(showroom).toHaveAttribute('data-skin-equipped-thruster', 'thruster-ion');
  await expect(ion).toHaveAttribute('data-owned', 'false');

  const standard = page.locator('[data-skin="thruster-basic"]');
  const equip = standard.locator('.garage-skin-action');
  await expect(equip).toBeDisabled();
  await standard.locator('.garage-skin-preview-hitarea').click();
  await expect(equip).toHaveText('Equip');
  await equip.click();
  await expect(showroom).toHaveAttribute('data-skin-equipped-thruster', 'thruster-basic');
});

test('public trial is explicitly free, never grants ownership and remembers the last pick on reload', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: true })));
  await page.goto('/');
  await page.locator('#garage-button').click();
  const catalog=page.locator('#garage-vfx-catalog');
  await expect(catalog).toHaveAttribute('data-release-mode','trial');
  await expect(catalog).toContainText(/free trial|免費試用/i);
  const ion=catalog.locator('[data-skin="thruster-ion"]');
  await expect(ion).toHaveAttribute('data-state','trial');
  await ion.locator('.garage-skin-preview-hitarea').click();
  await ion.locator('.garage-skin-action').click();
  await expect(ion).toHaveAttribute('data-state','equipped');
  await expect(ion).toHaveAttribute('data-owned','false');
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster','thruster-ion');
  await page.reload();
  await page.locator('#garage-button').click();
  const after=page.locator('#garage-vfx-catalog [data-skin="thruster-ion"]');
  await expect(after).toHaveAttribute('data-state','equipped');
  await expect(after).toHaveAttribute('data-owned','false');
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster','thruster-ion');
  const stored = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('skyline-rush-garage-skin-picks'))
    .map(key => localStorage.getItem(key)).join(''));
  expect(stored).toContain('thruster-ion');
  expect(stored).not.toMatch(/owned|trial|expires/i);
  // A forged entitlement in storage must not unlock anything on reload.
  await page.evaluate(() => localStorage.setItem('skyline-rush-garage-skin-picks:guest',
    JSON.stringify({ version: 1, accountId: 'guest', owned: ['airflow-vortex'], picks: { airflow: 'airflow-vortex', thruster: 'airflow-prism' } })));
  await page.reload();
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster','thruster-basic');
  await expect(page.locator('#garage-vfx-catalog [data-skin="airflow-vortex"]')).toHaveAttribute('data-owned','false');
  await expect(page.locator('#garage-vfx-catalog')).not.toContainText(/buy now|purchase|立即購買/i);
});
