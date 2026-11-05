import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test('Garage shows four live 3x VFX artwork slots at ' + viewport.width + 'x' + viewport.height, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    const loadout = page.locator('#garage-vfx-live-loadout');
    await loadout.scrollIntoViewIfNeeded();
    await expect(loadout).toBeVisible();
    await expect(loadout.locator('[data-loadout-category]')).toHaveCount(4);
    const thruster = loadout.locator('[data-loadout-category="thruster"]');
    await expect(thruster).toHaveAttribute('data-equipped-skin', 'thruster-basic');
    await expect(thruster.locator('.artwork-img')).toHaveAttribute('src', /raster\/thruster-basic@3x\.webp$/);
    const size = await thruster.locator('.artwork-img').evaluate(async img => {
      await img.decode();
      const box = img.getBoundingClientRect();
      return [img.naturalWidth, img.naturalHeight, box.width, box.height];
    });
    expect(size).toEqual([288, 288, 96, 96]);
    const airflow = loadout.locator('[data-loadout-category="airflow"]');
    await expect(airflow.locator('.artwork-img')).toHaveAttribute('src', /raster\/airflow-basic@3x\.png$/);
    await expect(airflow).toHaveAttribute('data-owned', 'true');

    await page.locator('[data-skin="thruster-ion"] .garage-skin-preview-hitarea').click();
    await loadout.scrollIntoViewIfNeeded();
    await expect(thruster).toHaveAttribute('data-preview-skin', 'thruster-ion');
    await expect(thruster).toHaveAttribute('data-equipped-skin', 'thruster-basic');
    await expect(thruster).toHaveAttribute('data-owned', 'false');
    await expect(thruster.locator('.artwork-img')).toHaveAttribute('src', /raster\/thruster-ion@3x\.webp$/);
    await expect(thruster.locator('.garage-loadout-status')).toHaveText('Previewing');

    await page.locator('[data-skin="thruster-ion"] .garage-skin-action').click();
    await loadout.scrollIntoViewIfNeeded();
    await expect(thruster).toHaveAttribute('data-equipped-skin', 'thruster-ion');
    await expect(thruster).toHaveAttribute('data-owned', 'false');
    await expect(thruster.locator('.garage-loadout-status')).toHaveText('Trial active');
    await expect(page.locator('#garage-preview #world')).toBeVisible();
  });
}

test('live VFX thumbnail falls back if PNG fails, without unlocking', async ({ page }) => {
  await page.route('**/feature-assets/garage-vfx-skins/raster/airflow-basic@3x.png', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  const tile = page.locator('#garage-vfx-live-loadout [data-loadout-category="airflow"]');
  await tile.scrollIntoViewIfNeeded();
  await expect(tile.locator('.artwork-img')).toHaveAttribute('src', /airflow\.svg$/);
  await expect(tile).toHaveAttribute('data-owned', 'true');
});

test('live VFX labels are localized and motion-safe', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const loadout = page.locator('#garage-vfx-live-loadout');
  await loadout.scrollIntoViewIfNeeded();
  await expect(loadout.locator('h4')).toHaveText('目前外觀特效');
  await page.locator('[data-skin="thruster-ion"] .garage-skin-preview-hitarea').click();
  const tile = loadout.locator('[data-loadout-category="thruster"]');
  await expect(tile.locator('.garage-loadout-status')).toHaveText('預覽中');
  const motion = await tile.evaluate(el => getComputedStyle(el).animationName);
  expect(motion).toBe('none');
  await expect(tile).toHaveAttribute('data-owned', 'false');
});
