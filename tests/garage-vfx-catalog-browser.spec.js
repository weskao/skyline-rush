import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`Garage VFX catalog is bilingual and preserves PAINTS on ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    const catalog = page.locator('#garage-vfx-catalog');
    await expect(catalog).toBeVisible();
    await expect(catalog).toHaveAttribute('data-preview-contract', 'live-shared-aero');
    await expect(catalog.locator('[data-skin]')).toHaveCount(22);
    await expect(catalog.getByRole('button')).toHaveCount(44);
    await expect(page.locator('[data-paint="pearl"]')).toHaveAttribute('data-state', 'equipped');
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    const screenshot = await page.screenshot();
    await test.info().attach(`garage-skins-phaseb-${viewport.width}x${viewport.height}.png`, { body: screenshot, contentType: 'image/png' });
  });
}

test('selected artwork animates at original 3x dimensions while retaining WebP fallback', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const ion = page.locator('[data-skin="thruster-ion"] img');
  await ion.scrollIntoViewIfNeeded();
  await expect(ion).toHaveAttribute('data-static-src', /raster\/thruster-ion@3x\.webp$/);
  await expect(ion).toHaveAttribute('src', /garage-animated\/thruster-ion@3x\.gif$/);
  await expect(ion).toHaveAttribute('width', '96');
  await expect(ion).toHaveAttribute('height', '96');
  await expect(ion).toBeVisible();
  const dims = await ion.evaluate(img => ({ width: img.naturalWidth, height: img.naturalHeight }));
  expect(dims).toEqual({ width: 288, height: 288 });
});

test('unavailable GIF and original WebP fall back to category SVG, without granting ownership', async ({ page }) => {
  await page.route('**/feature-assets/garage-animated/thruster-ion@3x.gif', route => route.abort());
  await page.route('**/feature-assets/garage-vfx-skins/raster/thruster-ion@3x.webp', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const ion = page.locator('[data-skin="thruster-ion"]');
  await ion.scrollIntoViewIfNeeded(); // lazy art loads (and can fail) only once scrolled in
  await expect(ion.locator('img')).toHaveAttribute('src', /thruster\.svg$/);
  await expect(ion).toHaveAttribute('data-state', 'trial');
  await expect(page.locator('#garage-equip')).toBeDisabled();
});

test('missing GIF, WebP and SVG shows accessible text fallback without unlocking a skin', async ({ page }) => {
  await page.route('**/feature-assets/garage-animated/thruster-ion@3x.gif', route => route.abort());
  await page.route('**/feature-assets/garage-vfx-skins/raster/thruster-ion@3x.webp', route => route.abort());
  await page.route('**/feature-assets/garage-vfx-skins/thruster.svg', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const ion = page.locator('[data-skin="thruster-ion"]');
  await ion.scrollIntoViewIfNeeded(); // lazy art loads (and can fail) only once scrolled in
  await expect(ion.locator('.garage-vfx-fallback')).toBeVisible();
  await expect(ion).toHaveAttribute('data-state', 'trial');
  await expect(page.locator('#garage-equip')).toBeDisabled();
});

test('skins catalog copies switch between English and Traditional Chinese', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('#garage-vfx-catalog-heading')).toHaveText('外觀特效收藏');
  await expect(page.locator('[data-skin="thruster-ion"]')).toContainText('離子推進器');
  await page.locator('#garage-close').click();
  await selectLocale(page, 'en');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('#garage-vfx-catalog-heading')).toHaveText('VFX collection');
  await expect(page.locator('[data-skin="thruster-ion"]')).toContainText('Ion thruster');
});

test('eleven original 3x badge/rarity artworks appear in a non-entitlement showcase', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const gallery = page.locator('#garage-vfx-art-badges');
  await expect(gallery).toBeVisible();
  await expect(gallery.locator('img')).toHaveCount(11);
  const first = gallery.locator('img').first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toHaveAttribute('width', '72');
  await expect(first).toHaveAttribute('height', '72');
  await expect(first).toHaveJSProperty('naturalWidth', 216);
  await expect(gallery).toContainText(/reference|參考|style|樣式/i);
  await expect(page.locator('#garage-vfx-catalog')).not.toContainText(/buy now|立即購買/i);
});

test('badge reference art falls back to visible accessible label if the 3x image fails', async ({ page }) => {
  await page.route('**/feature-assets/garage-animated/badge-equipped@3x.gif', route => route.abort());
  await page.route('**/feature-assets/garage-vfx-skins/raster/badge-equipped@3x.png', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  const card = page.locator('#garage-vfx-art-badges figure').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('img')).toHaveCount(0);
  // The fallback must be readable and agree with its accessible name, not leak an internal asset ID.
  await expect(card.locator('[role="img"]')).toHaveText('Equipped badge');
  await expect(card.locator('[role="img"]')).toHaveAttribute('aria-label', 'Equipped badge');
  await expect(card.locator('figcaption')).toHaveText('Equipped badge');
});

test('failed badge artwork remains accessible and localized in Traditional Chinese', async ({ page }) => {
  await page.route('**/feature-assets/garage-animated/badge-equipped@3x.gif', route => route.abort());
  await page.route('**/feature-assets/garage-vfx-skins/raster/badge-equipped@3x.png', route => route.abort());
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  const card = page.locator('#garage-vfx-art-badges figure').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('img')).toHaveCount(0);
  await expect(card.locator('[role="img"]')).toHaveText('已裝備徽章');
  await expect(card.locator('[role="img"]')).toHaveAttribute('aria-label', '已裝備徽章');
  await expect(card.locator('figcaption')).toHaveText('已裝備徽章');
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`restored Equipped/Favorite/Limited badge artwork has full symmetric alpha silhouettes and separate readable labels at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const badges = page.locator('#garage-vfx-art-badges');
    const names = ['badge-equipped', 'badge-favorite', 'badge-limited'];
    for (const id of names) {
      const tile = badges.locator(`figure[data-badge-art="${id}"]`);
      await tile.scrollIntoViewIfNeeded();
      await expect(tile).toBeVisible();
      await expect(tile).toHaveAttribute('data-artwork-restored', 'true');
      const img = tile.locator('img');
      await expect(img).toHaveAttribute('width', '72');
      await expect(img).toHaveAttribute('height', '72');
      await expect(img).toHaveAttribute('data-static-src', new RegExp(`${id}@3x\\.png$`));
      const result = await tile.evaluate(async figure => {
        const displayed = figure.querySelector('img');
        // The displayed art swaps to a palette-limited GIF once visible; audit the original PNG's alpha instead.
        const image = new Image();
        image.src = displayed.dataset.staticSrc;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] <= 16) continue;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
        const imageBox = displayed.getBoundingClientRect();
        const frame = figure.querySelector('.garage-badge-art-frame')?.getBoundingClientRect();
        const caption = figure.querySelector('figcaption')?.getBoundingClientRect();
        return {
          size: [canvas.width, canvas.height], minX, minY, maxX, maxY,
          frameSize: frame ? [frame.width, frame.height] : [],
          insetLeft: frame ? imageBox.left - frame.left : -1,
          insetRight: frame ? frame.right - imageBox.right : -1,
          captionGap: frame && caption ? caption.top - frame.bottom : -1,
        };
      });
      expect(result.size).toEqual([216, 216]); // original 3× image pixels
      expect(result.minX).toBeGreaterThanOrEqual(10);
      expect(result.minY).toBeGreaterThanOrEqual(10);
      expect(result.maxX).toBeLessThanOrEqual(205);
      expect(result.maxY).toBeLessThanOrEqual(205);
      expect(Math.abs(result.minX - (215 - result.maxX))).toBeLessThanOrEqual(8);
      expect(Math.abs(result.minY - (215 - result.maxY))).toBeLessThanOrEqual(8);
      expect(result.frameSize).toEqual([88, 88]); // 72px badge within 8px safe space
      expect(result.insetLeft).toBeGreaterThanOrEqual(7);
      expect(result.insetRight).toBeGreaterThanOrEqual(7);
      expect(result.captionGap).toBeGreaterThanOrEqual(4);
      await test.info().attach(`${id}-safe-3x-${viewport.width}x${viewport.height}.png`, {
        body: await tile.screenshot(), contentType: 'image/png',
      });
    }
  });
}


for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`all eleven badges reuse the same responsive neon card, 3x art and localized caption at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const tiles = page.locator('#garage-vfx-art-badges .garage-badge-card');
    await expect(tiles).toHaveCount(11);
    const colors = [];
    for (const tile of await tiles.all()) {
      await tile.scrollIntoViewIfNeeded();
      // Lazy art loads once scrolled in, then swaps to its GIF; decode() on that moving src throws, so poll the size (browser-test-stability.md).
      await expect.poll(() => tile.locator('img').evaluate(img => [img.dataset.animationActive, img.naturalWidth, img.naturalHeight]), { message: 'badge GIF attached and decoded at 3x' }).toEqual(['true', 216, 216]);
      const info = await tile.evaluate(figure => {
        const img = figure.querySelector('img');
        const frame = figure.querySelector('.garage-badge-art-frame');
        const caption = figure.querySelector('figcaption');
        const a = img.getBoundingClientRect(), b = frame.getBoundingClientRect(), c = caption.getBoundingClientRect();
        const css = getComputedStyle(figure);
        return { hue: css.getPropertyValue('--badge-hue').trim(), background: css.backgroundImage,
          native: [img.naturalWidth,img.naturalHeight], cssSize: [a.width,a.height],
          frame: [b.width,b.height], imageInside: a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom,
          captionBelow: c.top >= b.bottom + 4, widthWithinViewport: b.right <= innerWidth };
      });
      expect(info.native).toEqual([216,216]);
      expect(info.cssSize).toEqual([72,72]);
      expect(info.frame).toEqual([88,88]);
      expect(info.imageInside).toBe(true);
      expect(info.captionBelow).toBe(true);
      expect(info.widthWithinViewport).toBe(true);
      expect(info.background).toContain('gradient');
      expect(info.hue).toMatch(/^\d+$/);
      colors.push(info.hue);
    }
    expect(new Set(colors).size).toBeGreaterThanOrEqual(3);
    const accents = await Promise.all(['badge-equipped','badge-favorite','badge-limited'].map(async id =>
      page.locator(`#garage-vfx-art-badges [data-badge-art="${id}"]`).getAttribute('data-badge-tone')));
    expect(accents).toEqual(['cyan','magenta','gold']);
  });
}

// Entire card acts as the non-persistent Preview control; only Equip/Try is a visible action.
for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]) {
  test(`Garage collection cards preview on full surface with keyboard and show game-like hover at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    for (const [id,category] of [['thruster-void','thruster'],['airflow-vortex','airflow'],['nitro-trail-gold','nitro-trail'],['launch-flare-ring','launch-flare']]) {
      const card=page.locator(`#garage-vfx-catalog [data-skin="${id}"]`);
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('.garage-vfx-actions button')).toHaveCount(1);
      const preview=card.getByRole('button',{name:/preview|預覽/i});
      await expect(preview).toHaveAttribute('aria-pressed','false');
      await card.locator('.garage-vfx-art').click();
      await expect(card).toHaveAttribute('data-preview-active','true');
      await expect(page.locator('#garage-preview')).toHaveAttribute(`data-skin-preview-${category}`,id);
      await expect(preview).toHaveAttribute('aria-pressed','true');
      await expect(card.locator('.garage-vfx-actions button')).not.toHaveText(/preview|預覽/i);
      const hue=await card.evaluate(el=>getComputedStyle(el).getPropertyValue('--card-hue').trim());
      expect(hue).toMatch(/^\d+$/);
    }
    const ion=page.locator('#garage-vfx-catalog [data-skin="thruster-ion"]');
    await ion.getByRole('button',{name:/preview|預覽/i}).focus();
    await page.keyboard.press('Enter');
    await expect(ion).toHaveAttribute('data-preview-active','true');
    const equippedBefore=await page.locator('#garage-preview').getAttribute('data-skin-equipped-thruster');
    await expect(ion.locator('.garage-vfx-actions button')).toBeEnabled();
    await ion.locator('.garage-vfx-actions button').click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-equipped-thruster','thruster-ion');
    expect(equippedBefore).toBe('thruster-basic');
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-preview-thruster','thruster-ion');
    await test.info().attach(`garage-collection-ux-${viewport.width}x${viewport.height}.png`,{
      body:await page.locator('#garage-vfx-catalog').screenshot(),contentType:'image/png'
    });
  });
}


test('paint swatch card keeps full-surface Preview and one shared game-like action style', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await page.locator('#garage-button').click();
  const paint=page.locator('#garage-screen [data-paint="cobalt"]');
  await expect(paint).toHaveAttribute('type','button');
  await paint.focus();
  await page.keyboard.press('Enter');
  await expect(paint).toHaveAttribute('aria-pressed','true');
  const before=await paint.evaluate(el=>({border:getComputedStyle(el).borderRadius,background:getComputedStyle(el).backgroundImage}));
  expect(before.background).toContain('gradient');
  await paint.hover();
  const onHover=await paint.evaluate(el=>({shadow:getComputedStyle(el).boxShadow,transform:getComputedStyle(el).transform}));
  expect(onHover.shadow).not.toBe('none');
  await expect(page.locator('#garage-equip')).toBeVisible();
  await expect(page.locator('#garage-restore-default')).toHaveCount(1);
});

// A click lights the whole card the same way in every category: no frame or dimmed box around part of it.
test('clicking a skin card lights the whole card the same way in every category', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('#garage-button').click();
  const looks = [];
  for (const id of ['thruster-void', 'airflow-vortex', 'nitro-trail-red', 'launch-flare-red']) {
    const card = page.locator(`#garage-vfx-catalog [data-skin="${id}"]`), hit = card.locator('.garage-skin-preview-hitarea');
    await card.scrollIntoViewIfNeeded();
    const idle = await card.evaluate(el => getComputedStyle(el).boxShadow);
    const box = await card.locator('.garage-vfx-art').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    const pressed = await hit.evaluate(el => ({ filter: getComputedStyle(el).filter, card: getComputedStyle(el.parentElement).filter }));
    await page.mouse.up(); await page.mouse.move(0, 0);
    await expect(card).toHaveAttribute('data-preview-active', 'true');
    await page.waitForTimeout(250);
    const lit = await card.evaluate(el => {
      const cs = getComputedStyle(el), hit = getComputedStyle(el.querySelector('.garage-skin-preview-hitarea'));
      return { shadow: cs.boxShadow, border: cs.borderTopColor, outline: hit.outlineStyle, hitShadow: hit.boxShadow };
    });
    expect(pressed.filter, `${id}: press does not dim a box inside the card`).toBe('none');
    expect(pressed.card, `${id}: press feedback covers the whole card`).not.toBe('none');
    expect(lit.shadow, `${id}: the selected card glows`).not.toBe(idle);
    expect([lit.outline, lit.hitShadow], `${id}: no extra frame inside the card`).toEqual(['none', 'none']);
    looks.push(lit.shadow.replace(/rgba?\([^)]*\)/g, 'c'));
  }
  expect(new Set(looks).size, 'one selected look for every category').toBe(1);
});

// Original collage cutouts could have internal truncation despite having transparent outer pixels.
// These eight artworks were re-authored at native 216×216, not enlarged from cutouts.
for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`all eight regenerated badge/rarity WebPs show complete native 3x silhouettes at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const ids = ['badge-locked', 'badge-new', 'badge-trial', 'rarity-common', 'rarity-rare',
      'rarity-epic', 'rarity-legendary', 'rarity-mythic'];
    for (const id of ids) {
      const tile = page.locator(`#garage-vfx-art-badges [data-badge-art="${id}"]`);
      await tile.scrollIntoViewIfNeeded();
      await expect(tile).toHaveAttribute('data-artwork-restored', 'true');
      const image = tile.locator('img');
      await expect(image).toHaveAttribute('data-static-src', new RegExp(`${id}@3x\\.webp$`));
      await expect(image).toHaveAttribute('src', new RegExp(`garage-animated/${id}@3x\\.gif$`));
      const result = await tile.evaluate(async figure => {
        const img = figure.querySelector('img');
        await img.decode();
        // Original native 3x source has full quality; GIF is palette-compressed.
        const original = new Image();
        original.src = img.dataset.staticSrc;
        await original.decode();
        const canvas = document.createElement('canvas');
        canvas.width = original.naturalWidth;
        canvas.height = original.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(original, 0, 0);
        const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const bounds = { minX: canvas.width, minY: canvas.height, maxX: -1, maxY: -1 };
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (rgba[(y * canvas.width + x) * 4 + 3] <= 16) continue;
          bounds.minX = Math.min(bounds.minX, x);
          bounds.minY = Math.min(bounds.minY, y);
          bounds.maxX = Math.max(bounds.maxX, x);
          bounds.maxY = Math.max(bounds.maxY, y);
        }
        const frame = figure.querySelector('.garage-badge-art-frame').getBoundingClientRect();
        const picture = img.getBoundingClientRect();
        const caption = figure.querySelector('figcaption').getBoundingClientRect();
        return { natural: [canvas.width, canvas.height], css: [picture.width, picture.height],
          frame: [frame.width, frame.height],
          safeMargins: [bounds.minX, bounds.minY, canvas.width - 1 - bounds.maxX, canvas.height - 1 - bounds.maxY],
          contained: picture.left >= frame.left && picture.top >= frame.top && picture.right <= frame.right && picture.bottom <= frame.bottom,
          captionClear: caption.top >= frame.bottom + 4 };
      });
      expect(result.natural).toEqual([216, 216]);
      expect(result.css).toEqual([72, 72]);
      expect(result.frame).toEqual([88, 88]);
      expect(Math.min(...result.safeMargins), id).toBeGreaterThanOrEqual(12);
      expect(result.contained).toBe(true);
      expect(result.captionClear).toBe(true);
    }
  });
}
