import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
  test(`Wave3 garage-store-readiness read-only cards browse safely at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport); await page.goto('/');
    await page.locator('#garage-button').click();
    const gallery=page.locator('#garage-art-source-garage-store-readiness');
    await expect(gallery).toBeVisible();
    await expect(gallery).not.toHaveAttribute('open','');
    await gallery.locator('summary').click();
    const entryIcon = gallery.locator('summary [data-wave3-entry-icon] img');
    await expect(entryIcon).toBeVisible();
    await expect(entryIcon).toHaveJSProperty('naturalWidth', 216);
    await expect(entryIcon).toHaveJSProperty('naturalHeight', 216);
    await expect(entryIcon).toHaveAttribute('src', /store-collection@3x\.png$/);
    await expect(gallery.locator('[data-store-phase="coming-soon"]')).toHaveText('Shop · Coming soon — preview only');
    const cards=gallery.locator('button[data-wave3-asset]');
    await expect(cards).toHaveCount(6);
    const picked=cards.nth(1), id=await picked.getAttribute('data-wave3-asset');
    await picked.click();
    await expect(picked).toHaveAttribute('aria-pressed','true');
    await expect(gallery.locator('[data-wave3-selected]')).toHaveAttribute('data-wave3-selected',id);
    await expect(gallery.locator('[data-wave3-description]')).not.toBeEmpty();
    await expect(gallery.getByRole('button',{name:/buy|claim|purchase|pay|領取|購買/i})).toHaveCount(0);
    const geometry=await picked.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('img')?.getBoundingClientRect();return{width:a.width,height:a.height,inside:b?b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom:true}});
    expect(geometry.height).toBeGreaterThanOrEqual(44); expect(geometry.inside).toBe(true);
    await picked.focus();await page.keyboard.press('Enter');await expect(picked).toHaveAttribute('aria-pressed','true');
    await test.info().attach(`wave3-garage-store-readiness-${viewport.width}x${viewport.height}.png`,{body:await gallery.screenshot(),contentType:'image/png'});
  });
}
test('Wave3 garage-store-readiness filters and locale switch keep all buttons nontransactional',async({page})=>{
  await page.goto('/');await page.locator('#garage-button').click();
  const gallery=page.locator('#garage-art-source-garage-store-readiness');
  await gallery.locator('summary').click();
  await gallery.locator('[data-wave3-filter="collection"]').click();
  await expect(gallery.locator('button[data-wave3-asset]')).toHaveCount(2);
  // Native modal dialogs block the toolbar; change language through the actual reachable UI.
  await page.locator('#garage-close').click();
  await expect(page.locator('#garage-screen')).not.toBeVisible();
  await selectLocale(page,'zh-TW');
  await page.locator('#garage-button').click();
  const localized=page.locator('#garage-art-source-garage-store-readiness');
  await localized.locator('summary').click();
  await expect(localized.locator('[data-store-phase="coming-soon"]')).toHaveText('商店 · 即將推出 — 僅供預覽');
  await expect(localized.locator('[data-wave3-description]')).toContainText(/[一-龥]/);
  await expect(localized.getByRole('button',{name:/購買|領取|buy|claim/i})).toHaveCount(0);
});


const storeAssets = ['store-cart', 'store-box', 'store-bundle', 'store-tag', 'store-star', 'store-collection'];
const storeWithPartMotion = new Set(['store-box', 'store-bundle', 'store-collection']); // others: CSS sweep
for (const viewport of [{width:390,height:844}, {width:844,height:390}, {width:1440,height:900}]) {
  test(`all six store icons display complete transparent 3x art without cropping on ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const gallery = page.locator('#garage-art-source-garage-store-readiness');
    await gallery.locator('summary').click();
    for (const id of storeAssets) {
      const tile = gallery.locator(`[data-wave3-asset="${id}"]`);
      await tile.scrollIntoViewIfNeeded();
      await expect(tile.locator('figure')).toHaveAttribute('data-artwork-restored', 'true');
      const gif = storeWithPartMotion.has(id);
      await expect(tile.locator('img')).toHaveAttribute('data-animation-active', String(gif)); // GIF attaches after the tile scrolls in
      await expect(tile.locator('.garage-art-sweep')).toHaveCount(gif ? 0 : 1);
      const metrics = await tile.evaluate(async button => {
        const image = button.querySelector('img');
        await image.decode();
        // The displayed GIF is deliberately palette-limited. Audit original
        // transparent WebP for source fidelity and the GIF for playback/layout.
        const original = new Image();
        original.src = image.dataset.staticSrc;
        await original.decode();
        const frame = button.querySelector('.garage-badge-art-frame');
        const caption = button.querySelector('figcaption');
        const canvas = document.createElement('canvas');
        canvas.width = original.naturalWidth;
        canvas.height = original.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(original, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let left=canvas.width, top=canvas.height, right=-1, bottom=-1;
        for (let y=0; y<canvas.height; y++) for (let x=0; x<canvas.width; x++) {
          if (pixels[(y*canvas.width+x)*4+3] <= 16) continue;
          left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
        }
        // Protect the original vivid, detailed Store art direction, not only safe padding.
        let visible = 0, vivid = 0;
        const palette = new Set();
        for (let p = 0; p < pixels.length; p += 4) {
          if (pixels[p + 3] <= 25) continue;
          const r = pixels[p], g = pixels[p + 1], blue = pixels[p + 2];
          const peak = Math.max(r, g, blue), floor = Math.min(r, g, blue);
          visible++;
          if (peak > 127 && (peak - floor) / Math.max(1, peak) > 0.55) vivid++;
          palette.add(`${r >> 4}-${g >> 4}-${blue >> 4}`);
        }
        const a=image.getBoundingClientRect(), b=frame.getBoundingClientRect(), c=caption.getBoundingClientRect();
        return {type:image.currentSrc, original:original.currentSrc,
          animated:image.dataset.animationActive, nativeGif:[image.naturalWidth,image.naturalHeight],
          size:[canvas.width,canvas.height], bounds:[left,top,right,bottom],
          display:[a.width,a.height], imageInside:a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom,
          captionBelow:c.top>=b.bottom+4, frameInside:b.left>=button.getBoundingClientRect().left&&b.right<=button.getBoundingClientRect().right,
          fitsViewport: button.getBoundingClientRect().width <= innerWidth,
          vividFraction: vivid / Math.max(visible, 1), paletteBins: palette.size};
      });
      expect(metrics.type).toMatch(gif ? new RegExp(`garage-animated/${id}@3x\\.gif$`) : new RegExp(`raster/${id}@3x\\.webp$`));
      expect(metrics.animated).toBe(String(gif));
      expect(metrics.original).toMatch(/@3x\.png$/);
      expect(metrics.nativeGif).toEqual([216,216]);
      expect(metrics.size).toEqual([216,216]);
      expect(metrics.display).toEqual([72,72]);
      expect(metrics.bounds[0]).toBeGreaterThanOrEqual(20);
      expect(metrics.bounds[1]).toBeGreaterThanOrEqual(20);
      expect(metrics.bounds[2]).toBeLessThanOrEqual(195);
      expect(metrics.bounds[3]).toBeLessThanOrEqual(195);
      expect(metrics.imageInside).toBe(true);
      expect(metrics.captionBelow).toBe(true);
      expect(metrics.frameInside).toBe(true);
      expect(metrics.fitsViewport).toBe(true);
      expect(metrics.vividFraction, `${id}: retain bright, saturated illustrated artwork`).toBeGreaterThan(0.30);
      expect(metrics.paletteBins, `${id}: keep rich 3D materials and lighting`).toBeGreaterThan(450);
    }
    await test.info().attach(`store-icons-safe-3x-${viewport.width}x${viewport.height}.png`, {
      body: await gallery.screenshot(), contentType: 'image/png',
    });
  });
}

test('Store entrance icon loads native WebP without any PNG fallback', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const entryIcon = page.locator('#garage-art-source-garage-store-readiness summary [data-wave3-entry-icon] img');
  await expect(entryIcon).toHaveAttribute('src', /store-collection@3x\.webp$/);
  await expect(entryIcon).toHaveJSProperty('naturalWidth', 216);
});

test('Store preview keeps readable Coming Soon when the real 3x entrance icon fails', async ({ page }) => {
  await page.route('**/feature-assets/garage-store-readiness/raster/store-collection@3x.webp', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  const gallery = page.locator('#garage-art-source-garage-store-readiness');
  await expect(gallery.locator('summary')).toBeVisible();
  await expect(gallery.locator('summary [data-wave3-entry-icon] .artwork-fallback')).toBeVisible();
  await gallery.locator('summary').click();
  await expect(gallery.locator('[data-store-phase="coming-soon"]')).toHaveText('Shop · Coming soon — preview only');
  await expect(gallery.getByRole('button', {name: /buy|claim|purchase|pay/i})).toHaveCount(0);
});

for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
  test(`Wave3 garage-rewards-and-missions read-only cards browse safely at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport); await page.goto('/');
    await page.locator('#garage-button').click();
    const gallery=page.locator('#garage-art-source-garage-rewards-and-missions');
    await expect(gallery).toBeVisible();
    await expect(gallery).not.toHaveAttribute('open','');
    await gallery.locator('summary').click();
    const cards=gallery.locator('button[data-wave3-asset]');
    await expect(cards).toHaveCount(8);
    const firstArt=gallery.locator('.garage-source-grid img').first();
    await firstArt.scrollIntoViewIfNeeded();
    await expect(firstArt).toHaveAttribute('width','96');
    await expect(firstArt).toHaveAttribute('height','96');
    await expect(firstArt).toHaveJSProperty('naturalWidth',288);
    await expect(gallery).not.toContainText(/buy now|purchase|claim reward|立即購買|立即領取/i);
    const picked=cards.nth(1), id=await picked.getAttribute('data-wave3-asset');
    await picked.click();
    await expect(picked).toHaveAttribute('aria-pressed','true');
    await expect(gallery.locator('[data-wave3-selected]')).toHaveAttribute('data-wave3-selected',id);
    await expect(gallery.locator('[data-wave3-description]')).not.toBeEmpty();
    await expect(gallery.getByRole('button',{name:/buy|claim|purchase|pay|領取|購買/i})).toHaveCount(0);
    const geometry=await picked.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('img')?.getBoundingClientRect();return{width:a.width,height:a.height,inside:b?b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom:true}});
    expect(geometry.height).toBeGreaterThanOrEqual(44); expect(geometry.inside).toBe(true);
    await picked.focus();await page.keyboard.press('Enter');await expect(picked).toHaveAttribute('aria-pressed','true');
    await test.info().attach(`wave3-garage-rewards-and-missions-${viewport.width}x${viewport.height}.png`,{body:await gallery.screenshot(),contentType:'image/png'});
  });
}
test('Wave3 garage-rewards-and-missions filters and locale switch keep all buttons nontransactional',async({page})=>{
  await page.goto('/');await page.locator('#garage-button').click();
  const gallery=page.locator('#garage-art-source-garage-rewards-and-missions');
  await gallery.locator('summary').click();
  await gallery.locator('[data-wave3-filter="trophy"]').click();
  await expect(gallery.locator('button[data-wave3-asset]')).toHaveCount(4);
  // Native modal dialogs block the toolbar; change language through the actual reachable UI.
  await page.locator('#garage-close').click();
  await expect(page.locator('#garage-screen')).not.toBeVisible();
  await selectLocale(page,'zh-TW');
  await page.locator('#garage-button').click();
  const localized=page.locator('#garage-art-source-garage-rewards-and-missions');
  await localized.locator('summary').click();
  await expect(localized.locator('[data-wave3-description]')).toContainText(/[一-龥]/);
  await expect(localized.getByRole('button',{name:/購買|領取|buy|claim/i})).toHaveCount(0);
});
