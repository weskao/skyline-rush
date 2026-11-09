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

test('HUD art remains uncropped at alpha-pixel level and is visually reviewable at all three viewports', async ({ page }) => {
  test.setTimeout(ciTimeout(180000));
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#settings-button').click();
    const gallery = page.locator('#hud-3x-source-gallery');
    await gallery.locator('summary').click();
    const result = await gallery.evaluate(async root => {
      const entries = [];
      for (const card of root.querySelectorAll('.garage-badge-card')) {
        card.scrollIntoView({ block: 'nearest' });
        const img = card.querySelector('img');
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (rgba[(y * canvas.width + x) * 4 + 3] <= 16) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
        const margins = [left, top, canvas.width - right - 1, canvas.height - bottom - 1];
        entries.push({ name: img.dataset.image, margins, hasOpaqueArt: right >= left && bottom >= top });
      }
      return entries;
    });
    expect(result).toHaveLength(18);
    for (const art of result) {
      expect(art.hasOpaqueArt, art.name).toBe(true);
      // Narrow 156px-high buttons require 14px of native alpha safety;
      // 216px square HUD icons retain the stronger 20px all-edge gate.
      const minimum = art.name.startsWith('button-') ? 14 : 20;
      for (const margin of art.margins) {
        expect(margin, JSON.stringify(art)).toBeGreaterThanOrEqual(minimum - 1);
      }
    }
    // Keep a real on-disk screenshot as a CI artifact, not only an in-memory
    // Playwright attachment (which is discarded by the line reporter).
    const name = `hud-3x-complete-${viewport.width}x${viewport.height}.png`;
    const screenshot = test.info().outputPath(name);
    await gallery.screenshot({ path: screenshot });
    await test.info().attach(name, { path: screenshot, contentType: 'image/png' });
  }
});
