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

test('Garage Home section camera is temporary and never rewrites the saved showcase view', async ({ page }) => {
  await page.goto('/');
  const dock = page.locator('#showcase-camera-dock');
  const saved = await dock.getAttribute('data-view');
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-vfx') ?? '{}').view ?? null);
  const before = await stored();
  await openGarage(page);
  await openGarageSection(page, 'effects');
  await expect(dock).toHaveAttribute('data-view', 'rear');
  await openGarageSection(page, 'paints');
  await expect(dock).toHaveAttribute('data-view', 'left');
  expect(await stored()).toBe(before);
  await openGarageSection(page, 'cars');
  await expect(dock).toHaveAttribute('data-view', saved);
  await openGarageSection(page, 'effects');
  await page.locator('#garage-close').click();
  await expect(dock, 'closing the Garage restores the home camera').toHaveAttribute('data-view', saved);
  expect(await stored()).toBe(before);
});
