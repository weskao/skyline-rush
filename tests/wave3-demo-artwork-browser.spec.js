import { existsSync } from 'node:fs';
import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

const screens = [
  { width: 390, height: 844 }, { width: 844, height: 390 },
  { width: 1440, height: 900 },
];
const missionIds = ['mission-race', 'mission-time', 'mission-drift', 'mission-combo'];
const trophyIds = ['trophy-bronze', 'trophy-silver', 'trophy-gold', 'trophy-platinum'];
const storeIds = ['store-cart', 'store-box', 'store-bundle',
  'store-tag', 'store-star', 'store-collection'];

async function checkImage(image, nativePx, cssPx) {
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveJSProperty('naturalWidth', nativePx);
  await expect(image).toHaveJSProperty('naturalHeight', nativePx);
  const size = await image.evaluate(async el => {
    // Native dimensions are already awaited above. decode() here races the
    // IntersectionObserver replacing still artwork with the animated GIF.
    const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
    const url = new URL(el.currentSrc);
    const base = new URL('feature-assets/', location.href).pathname;
    return {
      width: rect.width, height: rect.height, fit: style.objectFit,
      url: url.pathname, base, loaded: el.complete && el.naturalWidth > 0,
    };
  });
  expect(size.loaded).toBe(true);
  expect([size.width, size.height]).toEqual([cssPx, cssPx]);
  expect(size.fit).toBe('contain');
  expect(size.url.startsWith(size.base), size.url + ' must use Vite base path').toBe(true);
}

async function checkStoreTile(button, id) {
  const image = button.locator('img');
  await checkImage(image, 216, 72);
  const metric = await button.evaluate(el => {
    const frame = el.querySelector('.garage-badge-art-frame');
    const img = el.querySelector('img');
    const caption = el.querySelector('figcaption');
    const a = el.getBoundingClientRect(), f = frame.getBoundingClientRect();
    const i = img.getBoundingClientRect(), c = caption.getBoundingClientRect();
    const style = getComputedStyle(frame);
    return {
      inset: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
      imageInside: i.left >= f.left - 1 && i.right <= f.right + 1
        && i.top >= f.top - 1 && i.bottom <= f.bottom + 1,
      captionBelow: c.top >= f.bottom,
      cardInside: a.left >= -1 && a.right <= innerWidth + 1,
      animated: img.dataset.animationActive,
      staticSrc: img.dataset.staticSrc,
    };
  });
  expect(metric.inset, id + ': minimum 8 CSS-pixel frame padding').toEqual(['8px', '8px', '8px', '8px']);
  expect(metric.imageInside, id + ': artwork spills past frame').toBe(true);
  expect(metric.captionBelow, id + ': caption overlaps art').toBe(true);
  expect(metric.cardInside, id + ': horizontal layout overflow').toBe(true);
  expect(metric.staticSrc).toMatch(new RegExp('garage-store-readiness/raster/' + id + '@3x\\.png$'));
  expect(['true', 'false']).toContain(metric.animated);
}

for (const viewport of screens) for (const locale of ['en', 'zh-TW']) {
  test('Wave 3 source art geometry and screenshots ' +
    viewport.width + 'x' + viewport.height + ' ' + locale, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    if (locale === 'zh-TW') await selectLocale(page, locale);
    await page.locator('#garage-button').click();

    const board = page.locator('.garage-mission-board');
    await expect(board).toBeVisible();
    await expect(board).toContainText(locale === 'en' ? 'Mission center' : '任務中心');
    await expect(board).toHaveAttribute('data-rewards-authority', 'local-demo');
    await expect(board).toContainText(locale === 'en' ? 'unverified and never server-backed' : '未經伺服器驗證');
    for (const id of missionIds) {
      const card = board.locator('[data-mission-id="' + id + '"]');
      await expect(card).toBeVisible();
      await checkImage(card.locator('img'), 288, 96);
    }
    for (const id of trophyIds) {
      const tile = board.locator('[data-trophy-id="' + id + '"]');
      await expect(tile).toHaveAttribute('data-trophy-state', 'display-only');
      await checkImage(tile.locator('img'), 288, 96);
      const below = await tile.evaluate(el => {
        const i = el.querySelector('img').getBoundingClientRect();
        return el.querySelector('figcaption').getBoundingClientRect().top >= i.bottom;
      });
      expect(below, id + ': trophy caption must remain below image').toBe(true);
    }
    await test.info().attach('store-icons-safe-3x-wave3-missions-' +
      viewport.width + 'x' + viewport.height + '-' + locale + '.png', {
      body: await board.screenshot(), contentType: 'image/png',
    });

    const store = page.locator('#garage-art-source-garage-store-readiness');
    await store.locator('summary').click();
    await expect(store.locator('[data-wave3-asset]')).toHaveCount(6);
    for (const id of storeIds) {
      await checkStoreTile(store.locator('[data-wave3-asset="' + id + '"]'), id);
    }
    await expect(store.locator('[data-store-purchase-disabled]')).toBeDisabled();
    await test.info().attach('store-icons-safe-3x-wave3-store-' +
      viewport.width + 'x' + viewport.height + '-' + locale + '.png', {
      body: await store.screenshot(), contentType: 'image/png',
    });
  });
}

test('Canvas verifies original source alpha bounds independently of displayed GIFs', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const gallery = page.locator('#garage-art-source-garage-store-readiness');
  await gallery.locator('summary').click();
  for (const id of storeIds) {
    const image = gallery.locator('[data-wave3-asset="' + id + '"] img');
    const insets = await image.evaluate(async el => {
      const source = new Image();
      source.src = el.dataset.staticSrc;
      await source.decode();
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(source, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 16) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      return [left, top, canvas.width - right - 1, canvas.height - bottom - 1];
    });
    expect(insets.every(v => v >= 20), id + ': source alpha clipped: ' + insets).toBe(true);
  }
});

test('corrupted Store PNG falls back to original WebP; missing assets keep localized text', async ({ page }) => {
  await page.route('**/store-tag@3x.png', route => route.fulfill({
    status: 200, contentType: 'image/png', body: 'invalid PNG bytes',
  }));
  await page.route('**/store-cart@3x.png', route => route.abort());
  await page.route('**/store-cart@3x.webp', route => route.abort());
  await page.route('**/mission-race@3x.png', route => route.abort());
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  const mission = page.locator('[data-mission-id="mission-race"]');
  await expect(mission.locator('.artwork-fallback')).toBeVisible();
  await expect(mission).toContainText('競速挑戰');

  const gallery = page.locator('#garage-art-source-garage-store-readiness');
  await gallery.locator('summary').click();
  const tag = gallery.locator('[data-wave3-asset="store-tag"] img');
  await tag.scrollIntoViewIfNeeded();
  await expect(tag).toHaveAttribute('src', /store-tag@3x\.webp$/);
  await expect(tag).toHaveJSProperty('naturalWidth', 216);
  const cart = gallery.locator('[data-wave3-asset="store-cart"]');
  await expect(cart.locator('.artwork-fallback')).toBeVisible();
  await expect(cart).toContainText('商店圖示');
  await expect(gallery.locator('[data-store-purchase-disabled]')).toBeDisabled();
});

test('reduced motion retains static art and VFX-Off hides the CSS sweep', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#garage-button').click();
  const store = page.locator('#garage-art-source-garage-store-readiness');
  await store.locator('summary').click();
  const box = store.locator('[data-wave3-asset="store-box"] img');
  await box.scrollIntoViewIfNeeded();
  await expect(box).toHaveAttribute('data-animation-active', 'false');
  await expect(box).toHaveAttribute('src', /store-box@3x\.png$/);
  const tagSweep = store.locator('[data-wave3-asset="store-tag"] .garage-art-sweep');
  await page.evaluate(() => { document.body.dataset.vfxEnabled = 'false'; });
  await expect.poll(() => tagSweep.evaluate(el => getComputedStyle(el).display)).toBe('none');
  await test.info().attach('store-icons-safe-3x-wave3-reduced-motion-vfx-off.png', {
    body: await store.screenshot(), contentType: 'image/png',
  });
});

test('externally approved demo WebPs, when present, must decode at their genuine native size and alpha inset', async ({ page }) => {
  const candidates = [
    ['demo-points@3x.webp', 216, 216, 20],
    ['demo-claim@3x.webp', 216, 216, 20],
    ['demo-collection-empty@3x.webp', 288, 288, 12],
    ['demo-results-banner@3x.webp', 432, 156, 0],
  ];
  const present = candidates.filter(([file]) =>
    existsSync(new URL('../public/feature-assets/wave3-demo/raster/' + file, import.meta.url)));
  test.skip(!present.length, 'New art has not been delivered by the external generation conversation');
  await page.goto('/');
  for (const [file, width, height, minInset] of present) {
    const result = await page.evaluate(async ({ file, width, height }) => {
      const image = new Image();
      image.src = new URL('feature-assets/wave3-demo/raster/' + file, location.href).href;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = -1, bottom = -1, transparent = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const alpha = bytes[(y * canvas.width + x) * 4 + 3];
        if (alpha === 0) transparent++;
        if (alpha <= 16) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      return { natural: [image.naturalWidth, image.naturalHeight],
        expected: [width, height], transparent,
        inset: [left, top, canvas.width - right - 1, canvas.height - bottom - 1] };
    }, { file, width, height });
    expect(result.natural, file + ': native 3x required, never upscale').toEqual(result.expected);
    expect(result.transparent, file + ': real alpha required').toBeGreaterThan(1000);
    expect(result.inset.every(value => value >= minInset), file + ': clipped glows').toBe(true);
  }
});

for (const viewport of screens) {
  test('A-03 approved Demo Points artwork is displayed at native 3x in Garage and Store ' +
    viewport.width + 'x' + viewport.height, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const board = page.locator('.garage-mission-board');
    await checkImage(board.locator('[data-wave3-demo-art="demo-points"] img'), 216, 72);
    await expect(board).toContainText(/Demo points|試玩點數/);
    await page.locator('[data-wave3-open-store]').click();
    const store = page.locator('[data-wave3-demo-store]');
    await checkImage(store.locator('[data-wave3-demo-art="demo-points"] img'), 216, 72);
    await expect(store.locator('.demo-wallet strong')).toHaveText('20');
    await test.info().attach('wave3-a03-wallet-' + viewport.width + 'x' + viewport.height + '.png', {
      body: await store.screenshot(), contentType: 'image/png',
    });
  });
}

test('A-03 WebP failure falls back to the approved PNG without losing live points labels', async ({ page }) => {
  await page.route('**/feature-assets/wave3-demo/raster/demo-points@3x.webp', route => route.abort());
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  const board = page.locator('.garage-mission-board');
  await expect(board.locator('[data-wave3-demo-art="demo-points"] img'))
    .toHaveAttribute('src', /demo-points@3x\.png$/);
  await page.locator('[data-wave3-open-store]').click();
  const store = page.locator('[data-wave3-demo-store]');
  await expect(store.locator('[data-wave3-demo-art="demo-points"] img'))
    .toHaveAttribute('src', /demo-points@3x\.png$/);
  await expect(store).toContainText('試玩點數');
});
