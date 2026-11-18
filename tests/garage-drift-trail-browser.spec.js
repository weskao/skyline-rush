import { test, expect, openGarage } from './helpers/test.js';
import { openGarageSection } from './helpers/garage-browser.js';
import { ciTimeout } from './helpers/ci.js';

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test('Garage drift preview and trial are independent at ' + viewport.width + '×' + viewport.height, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openGarage(page);
    await openGarageSection(page, 'effects');
    const category = page.locator('[data-vfx-category="drift-trail"]');
    await expect(category.locator('[data-skin]')).toHaveCount(6);
    const rainbow = category.locator('[data-skin="drift-trail-rainbow"]');
    const control = rainbow.locator('.garage-skin-preview-hitarea');
    await control.click();
    const preview = category.locator('[data-drift-preview]');
    await expect(preview).toHaveAttribute('data-drift-preview', 'drift-trail-rainbow');
    await preview.scrollIntoViewIfNeeded();
    await expect(preview).toHaveAttribute('data-live', 'true', { timeout: ciTimeout(18000) });
    await expect(preview).toHaveAttribute('data-motion', 'paused');
    await expect(control).toHaveAttribute('aria-pressed', 'true');
    const loadout = page.locator('[data-loadout-category="drift-trail"]');
    await expect(loadout).toHaveAttribute('data-equipped-skin', 'drift-trail-basic');
    const img = rainbow.locator('img');
    await expect(img).toHaveJSProperty('naturalWidth', 288);
    await rainbow.locator('.garage-skin-action').click();
    await expect(loadout).toHaveAttribute('data-equipped-skin', 'drift-trail-rainbow');
    await expect(loadout).toHaveAttribute('data-owned', 'false');

    await openGarageSection(page, 'cars');
    await page.locator('[data-car="crimson-gt"]').click();
    await openGarageSection(page, 'effects');
    await expect(loadout).toHaveAttribute('data-equipped-skin', 'drift-trail-rainbow');
    const arc = category.locator('[data-skin="drift-trail-arc"]');
    await arc.locator('.garage-skin-preview-hitarea').click();
    await expect(preview).toHaveAttribute('data-drift-preview', 'drift-trail-arc');
    await preview.scrollIntoViewIfNeeded();
    await expect(preview).toHaveAttribute('data-live', 'true', { timeout: ciTimeout(18000) });
    await expect(loadout).toHaveAttribute('data-equipped-skin', 'drift-trail-rainbow');
  });
}

test('Garage drift preview toggles between accessible play and pause artwork', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await openGarage(page);
  await openGarageSection(page, 'effects');
  await page.locator('[data-skin="drift-trail-flame"] .garage-skin-preview-hitarea').click();
  const preview = page.locator('[data-drift-preview]');
  await preview.scrollIntoViewIfNeeded();
  const pause = preview.getByRole('button', { name: 'Pause · Live drift preview' });
  await expect(pause.locator('svg[data-glyph="pause"]')).toBeVisible();
  const { width, height } = await pause.boundingBox();
  expect(Math.round(Math.min(width, height))).toBeGreaterThanOrEqual(44);

  await pause.click();
  const play = preview.getByRole('button', { name: 'Play · Live drift preview' });
  await expect(play.locator('svg[data-glyph="play"]')).toBeVisible();
  await expect(preview).toHaveAttribute('data-motion', 'paused');
  await expect(play).toBeFocused();
  await play.press('Enter');
  await expect(pause.locator('svg[data-glyph="pause"]')).toBeVisible();
  await expect(preview).toHaveAttribute('data-motion', 'running');
});
