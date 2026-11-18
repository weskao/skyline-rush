import { expect, openGarage, test } from './helpers/test.js';
import { openGarageSection } from './helpers/garage-browser.js';

const variants = ['flame', 'rainbow', 'ice', 'arc', 'stardust'];
const viewports = [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }];
for (const viewport of viewports) {
  test(`five drift trail cards show native 3× art with safe insets at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await openGarage(page);
    await openGarageSection(page, 'effects');
    const category = page.locator('[data-vfx-category="drift-trail"]');
    for (const variant of variants) {
      const card = category.locator(`[data-skin="drift-trail-${variant}"]`);
      const image = card.locator('.garage-vfx-art img');
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute('src', new RegExp(`drift-trail-${variant}@3x\\.webp$`));
      const layout = await image.evaluate(async img => {
        await img.decode();
        const { naturalWidth: width, naturalHeight: height } = img;
        const canvas = Object.assign(document.createElement('canvas'), { width, height });
        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0);
        const pixels = context.getImageData(0, 0, width, height).data;
        let left = width, top = height, right = -1, bottom = -1;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          if (pixels[(y * width + x) * 4 + 3] <= 16) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
        const art = img.getBoundingClientRect();
        const frame = img.parentElement.getBoundingClientRect();
        const caption = img.closest('button').querySelector('strong').getBoundingClientRect();
        return {
          native: [width, height], size: [art.width, art.height].map(Math.round),
          insets: [left, top, width - right - 1, height - bottom - 1],
          visibleWidth: right - left + 1,
          padding: Math.round(Math.min(art.left - frame.left, art.top - frame.top, frame.right - art.right, frame.bottom - art.bottom)),
          captionBelow: caption.top >= frame.bottom, fit: getComputedStyle(img).objectFit,
        };
      });
      expect(layout.native, variant).toEqual([288, 288]);
      expect(layout.size, variant).toEqual([96, 96]);
      expect(Math.min(...layout.insets), variant).toBeGreaterThanOrEqual(22);
      expect(layout.visibleWidth, variant).toBeGreaterThanOrEqual(210);
      expect(layout.padding, variant).toBeGreaterThanOrEqual(8);
      expect(layout.captionBelow, variant).toBe(true);
      expect(layout.fit, variant).toBe('contain');
    }
    await category.locator('h4').scrollIntoViewIfNeeded();
    const screenshot = await page.locator('#garage-screen').screenshot();
    await testInfo.attach('Garage drift trail cards', { body: screenshot, contentType: 'image/png' });
  });
}
