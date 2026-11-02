import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
test('all 18 3x original HUD/control images are accessible at 1x CSS in Settings', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settings-button').click();
  const gallery = page.locator('#hud-3x-source-gallery');
  await expect(gallery).toBeVisible();
  await gallery.locator('summary').click();
  const icons = gallery.locator('img');
  await expect(icons).toHaveCount(18);
  const wide = gallery.locator('img[data-image="button-back"]');
  const small = gallery.locator('img[data-image="hud-brake"]');
  await wide.scrollIntoViewIfNeeded();
  await expect(wide).toHaveAttribute('width', '144');
  await expect(wide).toHaveAttribute('height', '52');
  await expect(wide).toHaveJSProperty('naturalWidth', 432);
  await small.scrollIntoViewIfNeeded();
  await expect(small).toHaveAttribute('width', '72');
  await expect(small).toHaveAttribute('height', '72');
  await expect(small).toHaveJSProperty('naturalWidth', 216);
  await expect(page.locator('#touch-controls')).toBeHidden();
  await expect(gallery).not.toContainText(/enable purchase|claim reward|立即購買/i);
});

test('no button carries a decorative 3x image underneath its icon or label', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('button img.hud-3x-decor, button img.settings-art-decor')).toHaveCount(0);
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen')).toBeVisible();
});

test('all 18 artwork cards preserve native 3x pixels, visible icons and labels on phone and desktop', async ({ page }) => {
  test.setTimeout(ciTimeout(180000));
  for (const viewport of [{width:390,height:844}, {width:844,height:390}, {width:1440,height:900}]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#settings-button').click();
    const gallery = page.locator('#hud-3x-source-gallery');
    await gallery.locator('summary').click();
    const cards = gallery.locator('.garage-badge-card');
    await expect(cards).toHaveCount(18);
    // One browser round trip per viewport replaces 54 sequential scroll/evaluate calls that
    // exceeded the CI deadline. Every decoded original, bounding box and caption is still checked.
    await expect.poll(() => cards.evaluateAll(figures => figures.every(figure => {
      const img = figure.querySelector('img');
      return img?.complete && img.naturalWidth > 0;
    })), { timeout: ciTimeout(30000) }).toBe(true);
    const values = await cards.evaluateAll(figures => figures.map(figure => {
      const img = figure.querySelector('img');
      const f = figure.querySelector('.garage-badge-art-frame').getBoundingClientRect();
      const i = img.getBoundingClientRect();
      const c = figure.querySelector('figcaption').getBoundingClientRect();
      const wide = img.dataset.image.startsWith('button-');
      return { native: [img.naturalWidth, img.naturalHeight],
        display: [i.width, i.height], expected: wide ? [144,52] : [72,72],
        source: wide ? [432,156] : [216,216],
        inside: f.left<=i.left && i.right<=f.right && f.top<=i.top && i.bottom<=f.bottom,
        captionSafe: c.top>=f.bottom+4, viewportSafe: figure.getBoundingClientRect().right<=innerWidth };
    }));
    for (const v of values) {
      expect(v.native).toEqual(v.source); expect(v.display).toEqual(v.expected);
      expect(v.inside).toBe(true); expect(v.captionSafe).toBe(true);
      expect(v.viewportSafe).toBe(true);
    }
  }
});

