import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
test('all 18 artwork cards preserve native 3x pixels, visible icons and labels on phone and desktop', async ({ page }) => {
  test.setTimeout(ciTimeout(180000));
  for (const viewport of [{width:390,height:844}, {width:844,height:390}, {width:1440,height:900}]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#settings-button').click();
    const gallery = page.locator('#hud-3x-source-gallery');
    await expect(gallery).toBeVisible();
    await gallery.locator('summary').click();
    await expect(page.locator('#touch-controls')).toBeHidden();
    await expect(gallery).not.toContainText(/enable purchase|claim reward|立即購買/i);
    const cards = gallery.locator('.garage-badge-card');
    await expect(cards).toHaveCount(18);
    // One in-page pass per viewport: per-card Playwright scrolls wait for steady frames while the 3D home renders, which
    // took this test past its timeout on CPU-only CI. Each lazy image loads once its card is scrolled into view.
    const cardsMeasured = await gallery.evaluate(async root => {
      const results = [];
      for (const figure of root.querySelectorAll('.garage-badge-card')) {
        figure.scrollIntoView({ block: 'nearest' });
        const img = figure.querySelector('img');
        if (!img.complete || !img.naturalWidth) await new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true });
        });
        const f = figure.querySelector('.garage-badge-art-frame').getBoundingClientRect();
        const i = img.getBoundingClientRect();
        const c = figure.querySelector('figcaption').getBoundingClientRect();
        const wide = img.dataset.image.startsWith('button-');
        results.push({ name: img.dataset.image, native: [img.naturalWidth,img.naturalHeight],
          display: [i.width,i.height], expected: wide ? [144,52] : [72,72],
          source: wide ? [432,156] : [216,216],
          inside: f.left<=i.left && i.right<=f.right && f.top<=i.top && i.bottom<=f.bottom,
          captionSafe: c.top>=f.bottom+4, viewportSafe: figure.getBoundingClientRect().right<=innerWidth });
      }
      return results;
    });
    expect(cardsMeasured).toHaveLength(18);
    for (const v of cardsMeasured) {
      expect(v.native, v.name).toEqual(v.source); expect(v.display, v.name).toEqual(v.expected);
      expect(v.inside, v.name).toBe(true); expect(v.captionSafe, v.name).toBe(true);
      expect(v.viewportSafe, v.name).toBe(true);
    }
  }
});

