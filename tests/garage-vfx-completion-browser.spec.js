import { test, expect } from './helpers/test.js';

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`Airflow variants use independent native 3x transparent PNG thumbnails at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();

    for (const id of ['airflow-basic', 'airflow-slipstream', 'airflow-vortex', 'airflow-prism']) {
      const item = page.locator(`#garage-vfx-catalog [data-skin="${id}"]`);
      await item.scrollIntoViewIfNeeded();
      const image = item.locator('.artwork-img');
      await expect(image).toHaveAttribute('src', new RegExp(`/raster/${id}@3x\\.png$`));
      const result = await image.evaluate(async img => {
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(img, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0, left = canvas.width, top = canvas.height, right = 0, bottom = 0;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] <= 16) continue;
          count++; left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
        const box = img.getBoundingClientRect();
        return { size: [canvas.width, canvas.height], box: [box.width, box.height],
          count, margins: [left, top, canvas.width - 1 - right, canvas.height - 1 - bottom],
          cornerAlpha: pixels[3], src: img.currentSrc };
      });
      expect(result.size).toEqual([288, 288]);
      expect(result.box).toEqual([96, 96]);
      expect(result.count).toBeGreaterThan(400);
      expect(Math.min(...result.margins)).toBeGreaterThanOrEqual(16);
      expect(result.cornerAlpha).toBe(0);
    }
  });
}

test('previewing a skin is visibly distinct from equipping it', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const basic = page.locator('[data-skin="thruster-basic"]');
  const ion = page.locator('[data-skin="thruster-ion"]');
  await expect(basic).toHaveAttribute('data-state', 'equipped');
  await ion.locator('.garage-skin-preview-hitarea').click();
  await expect(ion).toHaveAttribute('data-preview-only', 'true');
  await expect(ion.locator('.garage-skin-preview-label')).toHaveText('Previewing');
  await expect(basic).toHaveAttribute('data-state', 'equipped');
  await expect(ion).toHaveAttribute('data-owned', 'false');
  await expect(page.locator('#garage-equip')).toBeDisabled();
  await basic.locator('.garage-skin-preview-hitarea').click();
  await expect(ion).toHaveAttribute('data-preview-only', 'false');
});

test('preview glow respects reduced motion without changing ownership', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const ion = page.locator('[data-skin="thruster-ion"]');
  await ion.locator('.garage-skin-preview-hitarea').click();
  const name = await ion.locator('.garage-vfx-art').evaluate(el => getComputedStyle(el, '::after').animationName);
  expect(name).toBe('none');
  await expect(ion).toHaveAttribute('data-state', 'trial');
});
