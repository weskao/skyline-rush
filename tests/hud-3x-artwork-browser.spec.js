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

  test('the thumb cluster shares one bezel and sprint flames burn beyond NITRO and BOOST', async ({ page }) => {
    test.setTimeout(ciTimeout(90000));
    await page.goto('/');
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('button[data-race-mode="free"]').tap();
    await page.locator('#start-button').tap();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    const touch = page.locator('#touch-controls');
    await expect(touch).toBeVisible();
    const boost = touch.locator('.touch-boost');
    await expect(boost).toHaveAttribute('data-boost-state', 'ready');
    await expect(boost).toHaveAttribute('data-flame', 'on');
    const rim = button => button.evaluate(element => getComputedStyle(element).getPropertyValue('--rim').trim());
    await expect.poll(() => rim(boost)).toBe('rgb(239, 174, 101)');

    // The live BOOST embers step through the 16-frame strip.
    const strip = await boost.evaluate(async element => {
      const style = getComputedStyle(element.querySelector('.sprint-ready-effect'), '::before');
      const image = new Image();
      image.src = (style.maskImage || style.webkitMaskImage).slice(5, -2);
      await image.decode();
      const first = style.maskPosition || style.webkitMaskPosition;
      await new Promise(resolve => setTimeout(resolve, 250));
      return { width: image.naturalWidth, height: image.naturalHeight, moved: (style.maskPosition || style.webkitMaskPosition) !== first };
    });
    expect(strip).toEqual({ width: 4608, height: 384, moved: true });

    // Sustained flame size per state, read from unmanaged copies so the HUD loop cannot rewrite them.
    const flames = await touch.evaluate(root => {
      const read = (selector, attribute, state, held = false) => {
        const copy = root.querySelector(selector).cloneNode(true);
        copy.setAttribute(attribute, state);
        copy.classList.toggle('is-held', held);
        root.querySelector('.touch-actions').append(copy);
        const result = {
          rest: Number(getComputedStyle(copy).getPropertyValue('--flame-rest') || 0),
          burning: getComputedStyle(copy.querySelector('.sprint-ready-effect'), '::before').animationName !== 'none',
        };
        copy.remove();
        return result;
      };
      return {
        nitroCharging: read('.touch-nitro', 'data-nitro-state', 'charging'),
        nitroReady: read('.touch-nitro', 'data-nitro-state', 'ready'),
        nitroActive: read('.touch-nitro', 'data-nitro-state', 'active'),
        boostReady: read('.touch-boost', 'data-boost-state', 'ready'),
        boostActive: read('.touch-boost', 'data-boost-state', 'active'),
        boostHeldEmpty: read('.touch-boost', 'data-boost-state', 'charging', true),
        gasRim: (() => {
          // Auto-throttle holds GAS, so read the resting green from an unheld copy.
          const copy = root.querySelector('.touch-gas').cloneNode(true);
          copy.classList.remove('is-held');
          root.querySelector('.touch-pedals').append(copy);
          const value = getComputedStyle(copy).getPropertyValue('--rim').trim();
          copy.remove();
          return value;
        })(),
      };
    });
    expect(flames.gasRim).toBe('rgb(111, 224, 160)');
    expect(flames.nitroCharging).toEqual({ rest: 0, burning: false });
    expect(flames.boostHeldEmpty).toEqual({ rest: 0, burning: false });
    expect(flames.nitroReady).toEqual({ rest: .55, burning: true });
    expect(flames.boostReady).toEqual({ rest: .3, burning: true });
    expect(flames.nitroActive).toEqual({ rest: 1, burning: true });
    expect(flames.boostActive).toEqual({ rest: 1, burning: true });

    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport);
      for (const action of ['nitro', 'boost', 'fly', 'throttle']) {
        const button = touch.locator(`[data-control="${action}"]`);
        const sprint = action === 'nitro' || action === 'boost';
        await expect(button.locator('svg').first()).toHaveAttribute('viewBox', sprint ? '0 0 28 28' : '0 0 24 24');
        await expect(button).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        const bezel = await button.evaluate(element => {
          const style = getComputedStyle(element, '::before');
          return [style.top, style.right, style.bottom, style.left];
        });
        expect(bezel).toEqual(['-1px', '-1px', '-1px', '-1px']);
        const box = await button.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        const cornerHitsButton = await button.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(rect.left + 2, rect.top + 2));
        });
        expect(cornerHitsButton).toBe(true);
        if (!sprint) continue;
        const effect = button.locator('.sprint-ready-effect');
        await expect(effect).toHaveCSS('pointer-events', 'none');
        await expect(effect).toHaveCSS('clip-path', 'none');
        const flame = await button.evaluate(element => {
          const rect = element.getBoundingClientRect();
          const fire = element.querySelector('.sprint-ready-effect').getBoundingClientRect();
          const neighbors = [...element.closest('#touch-controls').querySelectorAll('.touch-actions button, .touch-pedals button')]
            .filter(neighbor => neighbor !== element);
          return {
            height: rect.height,
            outsets: { top: rect.top - fire.top, right: fire.right - rect.right, bottom: fire.bottom - rect.bottom, left: rect.left - fire.left },
            inViewport: fire.left >= 0 && fire.top >= 0 && fire.right <= innerWidth && fire.bottom <= innerHeight,
            // Where the fire reaches a neighbour, a touch at the middle of the shared area must land on that neighbour.
            stolenTouches: neighbors.filter(neighbor => {
              const box = neighbor.getBoundingClientRect();
              const left = Math.max(fire.left, box.left), right = Math.min(fire.right, box.right);
              const top = Math.max(fire.top, box.top), bottom = Math.min(fire.bottom, box.bottom);
              return left < right && top < bottom && !neighbor.contains(document.elementFromPoint((left + right) / 2, (top + bottom) / 2));
            }).length,
          };
        });
        expect(flame.outsets.top).toBeGreaterThanOrEqual(flame.height * .4);
        expect(flame.outsets.left).toBeGreaterThanOrEqual(8);
        expect(flame.outsets.right).toBeGreaterThanOrEqual(8);
        expect(flame.outsets.bottom).toBeGreaterThan(0);
        expect(flame.inViewport).toBe(true);
        expect(flame.stolenTouches).toBe(0);
      }
      // A flame passes behind its neighbours: BOOST under NITRO, both under FLY and GAS.
      const stacking = await touch.evaluate(root => ['boost', 'nitro', 'fly', 'throttle']
        .map(action => getComputedStyle(root.querySelector(`[data-control="${action}"]`)).zIndex));
      expect(stacking).toEqual(['0', '1', '2', '2']);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const effect of await touch.locator('.sprint-ready-effect').all()) {
      await expect(effect).toHaveCSS('display', 'none');
    }
    await expect(page.locator('#error-message')).toBeHidden();
  });
});
