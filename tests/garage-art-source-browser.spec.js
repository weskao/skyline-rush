import { test, expect } from './helpers/test.js';

test('Garage source artwork is available at native 3x resolution with 1x CSS display without granting capabilities', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const source = page.locator('#garage-art-source-garage-store-readiness');
  await expect(source).toBeVisible();
  await source.locator('summary').click();
  const thumbnails = source.locator('img');
  await expect(thumbnails).toHaveCount(6);
  const first = thumbnails.first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toHaveAttribute('width', '72');
  await expect(first).toHaveAttribute('height', '72');
  await expect(first).toHaveJSProperty('naturalWidth', 216);
  await expect(source).not.toContainText(/buy now|purchase|claim reward|立即購買|立即領取/i);
});

test('safe 3x reference cards never crop image or caption on desktop and phone', async ({ page }) => {
  for (const viewport of [{width:390,height:844}, {width:844,height:390}, {width:1440,height:900}]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const gallery = page.locator('#garage-art-source-garage-store-readiness');
    await gallery.locator('summary').click();
    const cards = gallery.locator('.garage-badge-card');
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      const v = await card.evaluate(node => {
        const outer = node.getBoundingClientRect(), art = node.querySelector('img').getBoundingClientRect();
        const frame = node.querySelector('.garage-badge-art-frame').getBoundingClientRect();
        const caption = node.querySelector('figcaption').getBoundingClientRect();
        return { native: node.querySelector('img').naturalWidth, icon: [art.width,art.height],
          inside: frame.left <= art.left && frame.right >= art.right && frame.top <= art.top && frame.bottom >= art.bottom,
          labelSafe: caption.top >= frame.bottom + 4, width: outer.width, viewport: innerWidth };
      });
      expect(v.native).toBe(216);
      expect(v.icon).toEqual([72,72]);
      expect(v.inside).toBe(true); expect(v.labelSafe).toBe(true);
      expect(v.width).toBeLessThanOrEqual(v.viewport);
    }
  }
});
