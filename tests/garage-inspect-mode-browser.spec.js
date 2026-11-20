import { test, expect, openGarage } from './helpers/test.js';
import { openGarageSection } from './helpers/garage-browser.js';
import { selectLocale } from './helpers/locale-browser.js';

// One Garage: the full-screen view is an inspect mode of it, never a second, separately named page.
test('Garage keeps one title and names the full-screen view as an inspect mode in both locales', async ({ page }) => {
  await page.goto('/');
  for (const [locale, title, open, done] of [['en', 'Garage', 'Inspect', 'Done'], ['zh-TW', '車庫', '檢視模式', '結束檢視']]) {
    await selectLocale(page, locale);
    await openGarage(page);
    const screen = page.locator('#garage-screen');
    await expect(page.locator('#garage-title')).toHaveText(title);
    await expect(page.locator('#garage-studio-open')).toHaveText(open);
    await page.locator('#garage-studio-open').click();
    await expect(screen).toHaveAttribute('data-page', 'studio');
    await expect(page.locator('#garage-title')).toHaveText(title);
    await expect(page.locator('#garage-studio-back')).toContainText(done);
    await expect(screen).not.toContainText(/預覽工作室|PREVIEW STUDIO|返回車庫|Back to Garage/i);
    await page.locator('#garage-studio-back').click();
    await expect(screen).toHaveAttribute('data-page', 'home');
    await page.locator('#garage-close').click();
  }
});

test('inspect-mode camera turns to the part each Garage section changes', async ({ page }) => {
  await page.goto('/');
  await openGarage(page);
  await openGarageSection(page, 'effects');
  await page.locator('#garage-studio-open').click();
  const angle = page.locator('#garage-angle-name');
  await expect(angle, 'entering inspect mode on Effects faces the exhaust').toHaveAttribute('data-angle', 'rear');
  await openGarageSection(page, 'paints');
  await expect(angle).toHaveAttribute('data-angle', 'side');
  await openGarageSection(page, 'missions');
  await expect(angle, 'sections without a part keep the camera').toHaveAttribute('data-angle', 'side');
  await openGarageSection(page, 'cars');
  await expect(angle).not.toHaveAttribute('data-angle');
  await expect(page.locator('#garage-auto-rotate')).toHaveAttribute('aria-pressed', 'true');
});

for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
  test(`only the Garage showcase arrows change its selected view at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', view: 'right' })));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#garage-button').click();
    const dock = page.locator('#showcase-camera-dock');
    const name = dock.locator('#showcase-camera-name');
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-vfx') ?? '{}').view);
    await expect(page.locator('#garage-screen #showcase-camera-dock')).toBeVisible();
    await expect(dock).toHaveAttribute('data-view', 'right');
    const selectedName = await name.textContent();

    for (const section of ['paints', 'effects', 'missions', 'store', 'collection', 'cars']) {
      const tab = page.locator(`[data-garage-section="${section}"]`);
      if (section === 'collection' && !await tab.isVisible()) continue;
      await tab.click();
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
      await expect(dock, `${section} keeps the showcase view`).toHaveAttribute('data-view', 'right');
      await expect(name).toHaveText(selectedName);
    }

    await page.locator('[data-car="crimson-gt"]').click();
    await expect(dock).toHaveAttribute('data-view', 'right');
    await openGarageSection(page, 'paints');
    await page.locator('[data-paint="obsidian"]').click();
    await expect(dock).toHaveAttribute('data-view', 'right');
    await openGarageSection(page, 'effects');
    await page.locator('[data-skin="thruster-ion"] .garage-skin-preview-hitarea').click();
    await expect(dock).toHaveAttribute('data-view', 'right');

    for (const id of ['garage-pose-action', 'garage-wing', 'garage-lighting', 'garage-effects-toggle']) {
      await page.locator(`#${id}`).click();
      await expect(dock, `${id} keeps the showcase view`).toHaveAttribute('data-view', 'right');
    }

    await page.locator('#garage-studio-open').click();
    await expect(dock).toBeHidden();
    await page.locator('#garage-studio-back').click();
    await expect(dock).toBeVisible();
    await expect(dock).toHaveAttribute('data-view', 'right');
    await expect.poll(stored).toBe('right');

    await dock.locator('#showcase-camera-prev').click();
    await expect(dock).toHaveAttribute('data-view', 'left');
    await expect(name).not.toHaveText(selectedName);
    await expect.poll(stored).toBe('left');
    await dock.locator('#showcase-camera-next').click();
    await expect(dock).toHaveAttribute('data-view', 'right');
    await expect(name).toHaveText(selectedName);
    await expect.poll(stored).toBe('right');
    await page.locator('#garage-close').click();
    await expect(page.locator('#garage-screen #showcase-camera-dock')).toHaveCount(0);
    await expect(dock).toHaveAttribute('data-view', 'right');
  });
}
