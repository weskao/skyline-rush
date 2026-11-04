import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`non-transactional Store catalog shows honest states at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const catalog = page.locator('#garage-art-source-garage-store-readiness');
    await page.locator('[data-garage-store-open]').click();
    await expect(catalog).toHaveAttribute('open', '');
    await expect(page.locator('[data-garage-store-entry]')).toBeVisible();
    await expect(catalog.locator('[data-store-catalog]')).toBeVisible();
    await expect(catalog.locator('[data-store-phase="coming-soon"]')).toBeVisible();
    await expect(catalog.locator('[data-store-featured]')).toHaveCount(2);
    await expect(catalog.locator('[data-store-card-status]')).toHaveCount(6);
    await expect(catalog.locator('[data-store-purchase-disabled]')).toBeDisabled();
    await expect(catalog.locator('[data-wave3-asset="store-box"] [data-store-card-status]')).toHaveAttribute('data-store-card-status', 'unavailable');
    await expect(catalog.locator('[data-wave3-asset="store-tag"] [data-store-card-status]')).toHaveAttribute('data-store-card-status', 'unavailable');
    await expect(catalog.getByRole('button', { name: /buy|checkout|purchase|claim|pay/i })).toHaveCount(0);
    const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /owned|entitlement|balance|currency|store/i.test(key))));
    await catalog.locator('[data-wave3-asset="store-bundle"]').click();
    await expect(catalog.locator('[data-wave3-selected="store-bundle"]')).toBeVisible();
    await expect(catalog.locator('[data-wave3-asset="store-bundle"]')).toHaveAttribute('aria-pressed', 'true');
    const after = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /owned|entitlement|balance|currency|store/i.test(key))));
    expect(after).toEqual(before);
    await test.info().attach(`store-catalog-${viewport.width}x${viewport.height}.png`, {
      body: await catalog.screenshot(), contentType: 'image/png',
    });
  });
}

test('Store supports zh-TW and prevents keyboard or mouse purchases', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  const catalog = page.locator('#garage-art-source-garage-store-readiness');
  await catalog.locator('summary').click();
  await expect(catalog.locator('[data-store-catalog]')).toContainText('商店展示');
  await expect(catalog.locator('[data-store-purchase-disabled]')).toHaveText('尚未開放');
  await catalog.locator('[data-wave3-asset="store-star"]').focus();
  await page.keyboard.press('Enter');
  await expect(catalog.locator('[data-wave3-selected="store-star"]')).toBeVisible();
  await expect(catalog.getByRole('button', { name: /購買|付款|領取/ })).toHaveCount(0);
});

test('Store falls back to original source artwork when independent PNG is unavailable', async ({ page }) => {
  await page.route('**/store-tag@3x.png', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  const catalog = page.locator('#garage-art-source-garage-store-readiness');
  await catalog.locator('summary').click();
  const img = catalog.locator('[data-wave3-asset="store-tag"] img');
  await expect(img).toHaveAttribute('src', /store-tag@3x\.webp$/);
  await expect(img).toHaveJSProperty('naturalWidth', 216);
  await expect(catalog.locator('[data-store-purchase-disabled]')).toBeDisabled();
});

test('Store motion is disabled when the OS requests reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#garage-button').click();
  const catalog = page.locator('#garage-art-source-garage-store-readiness');
  await catalog.locator('summary').click();
  const transition = await catalog.locator('[data-wave3-asset="store-star"]').evaluate(el => getComputedStyle(el).transitionDuration);
  expect(transition).toBe('0s');
});

test('all six standalone Store PNGs preserve the restored WebP source pixels exactly', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const catalog = page.locator('#garage-art-source-garage-store-readiness');
  await catalog.locator('summary').click();
  const ids = ['store-cart','store-box','store-bundle','store-tag','store-star','store-collection'];
  for (const id of ids) {
    const picture = catalog.locator(`[data-wave3-asset="${id}"] img`);
    const metrics = await picture.evaluate(async img => {
      await img.decode();
      const original = new Image();
      original.src = img.src.replace(/\.png$/, '.webp');
      await original.decode();
      const source = document.createElement('canvas');
      const target = document.createElement('canvas');
      source.width = target.width = 216;
      source.height = target.height = 216;
      const lhs = source.getContext('2d');
      const rhs = target.getContext('2d');
      lhs.drawImage(original, 0, 0);
      rhs.drawImage(img, 0, 0);
      const a = lhs.getImageData(0, 0, 216, 216).data;
      const b = rhs.getImageData(0, 0, 216, 216).data;
      let mismatches = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) mismatches++;
      return { mismatches, size: [img.naturalWidth, img.naturalHeight] };
    });
    expect(metrics.size, id).toEqual([216, 216]);
    expect(metrics.mismatches, id + ': avoid altered/composited PNG or truncated icon').toBe(0);
  }
});
