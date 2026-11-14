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

test('existing NITRO HUD artwork renders over the real meter without changing BOOST controls', async ({ page }) => {
  await page.goto('/');
  const icon = page.locator('.nitro-hud [data-wave3-hud-art="hud-nitro"]');
  await expect(icon).toHaveAttribute('src', /mobile-controls-hud\/raster\/hud-nitro@3x\.webp$/);
  await expect(icon).toHaveJSProperty('naturalWidth', 216);
  await expect(page.locator('#nitro-meter')).toHaveAttribute('aria-valuemax', '3');
  // The settings preview also uses .touch-boost; verify the playable control separately.
  await expect(page.locator('#touch-controls button.touch-boost > svg')).toHaveCount(1);
  await expect(page.locator('#controls-panel .controls-preview-keys .touch-boost > svg')).toHaveCount(1);
  await expect(page.locator('#touch-controls button.touch-boost')).toHaveAttribute('data-control', 'boost');
});

test('if the NITRO source fails the engine meter and translated state remain usable', async ({ page }) => {
  await page.route('**/mobile-controls-hud/raster/hud-nitro@3x.webp', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.nitro-hud [data-wave3-hud-art="hud-nitro"]')).toHaveCount(0);
  await expect(page.locator('#nitro-status')).not.toBeEmpty();
  await expect(page.locator('#nitro-meter')).toHaveAttribute('role', 'meter');
});

test.describe('touch sprint artwork', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('NITRO and BOOST keep their full hitboxes and leave FLY and throttle alone', async ({ page }) => {
    test.setTimeout(ciTimeout(90000));
    await page.goto('/');
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('button[data-race-mode="free"]').tap();
    await page.locator('#start-button').tap();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    const touch = page.locator('#touch-controls');
    await expect(touch).toBeVisible();
    await expect(touch.locator('.touch-boost')).toHaveAttribute('data-boost-state', 'ready');
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport);
      for (const action of ['nitro', 'boost']) {
        const button = touch.locator(`[data-control="${action}"]`);
        await expect(button.locator('svg')).toHaveAttribute('viewBox', '0 0 28 28');
        await expect(button).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        const rim = await button.evaluate(element => getComputedStyle(element).getPropertyValue('--rim').trim());
        if (action === 'boost') expect(rim).toBe('#efae65');
        const effect = button.locator('.sprint-ready-effect');
        await expect(effect).toHaveCSS('pointer-events', 'none');
        const artwork = await button.evaluate(element => {
          const rect = element.getBoundingClientRect();
          const flame = element.querySelector('.sprint-ready-effect').getBoundingClientRect();
          const bezel = getComputedStyle(element, '::before');
          return {
            rimInsets: [bezel.top, bezel.right, bezel.bottom, bezel.left],
            flameOutsets: [rect.top - flame.top, flame.right - rect.right, flame.bottom - rect.bottom, rect.left - flame.left],
            inViewport: flame.left >= 0 && flame.top >= 0 && flame.right <= innerWidth && flame.bottom <= innerHeight,
            overlapsNeighbor: [...element.closest('#touch-controls').querySelectorAll('.touch-actions button, .touch-pedals button')]
              .filter(neighbor => neighbor !== element)
              .some(neighbor => {
                const box = neighbor.getBoundingClientRect();
                return flame.left < box.right && flame.right > box.left && flame.top < box.bottom && flame.bottom > box.top;
              }),
          };
        });
        expect(artwork.rimInsets).toEqual(['-1px', '-1px', '-1px', '-1px']);
        for (const outset of artwork.flameOutsets) {
          expect(outset).toBeGreaterThan(0);
          expect(outset).toBeLessThanOrEqual(8);
        }
        expect(artwork.inViewport).toBe(true);
        expect(artwork.overlapsNeighbor).toBe(false);
        await expect(effect).toHaveCSS('clip-path', 'none');
        const box = await button.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        const cornerHitsButton = await button.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(rect.left + 2, rect.top + 2));
        });
        expect(cornerHitsButton).toBe(true);
      }
      for (const action of ['fly', 'throttle']) {
        const button = touch.locator(`[data-control="${action}"]`);
        await expect(button.locator('svg').first()).toHaveAttribute('viewBox', '0 0 24 24');
        await expect(button).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const effect of await touch.locator('.sprint-ready-effect').all()) {
      await expect(effect).toHaveCSS('display', 'none');
    }
    await expect(page.locator('#error-message')).toBeHidden();
  });
});
