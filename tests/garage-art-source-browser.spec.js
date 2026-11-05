import { test, expect } from './helpers/test.js';

test('Garage source artwork is available at native 3x resolution with 1x CSS display without granting capabilities', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const source = page.locator('#garage-art-source-garage-store-readiness');
  await expect(source).toBeVisible();
  const entry = source.locator('summary img[data-image="store-collection-summary"]');
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute('width', '72');
  await expect(entry).toHaveAttribute('height', '72');
  await expect(entry).toHaveJSProperty('naturalWidth', 216);
  await source.locator('summary').click();
  const thumbnails = source.locator('.garage-source-grid img');
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

test('Store 3x artwork appears directly in Garage and opens its 6-image interactive gallery', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const viewport of [{width:1440,height:900}, {width:390,height:844}, {width:844,height:390}]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const gallery = page.locator('#garage-art-source-garage-store-readiness');
    await expect(gallery).toBeVisible();
    await expect(gallery).toHaveAttribute('data-economy-preview','art-only');
    const entry = gallery.locator('summary img[data-image="store-collection-summary"]');
    await entry.scrollIntoViewIfNeeded();
    await expect(entry).toHaveJSProperty('naturalWidth', 216);
    await expect(entry).toHaveJSProperty('naturalHeight', 216);
    const geometry = await entry.evaluate(image => {
      const box = image.getBoundingClientRect();
      return { width: box.width, height: box.height, objectFit: getComputedStyle(image).objectFit,
        contained: box.left >= 0 && box.right <= innerWidth };
    });
    expect(geometry).toEqual({width:72,height:72,objectFit:'contain',contained:true});
    await gallery.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(gallery).toHaveAttribute('open','');
    await expect(gallery.locator('[data-wave3-asset]')).toHaveCount(6);
    await gallery.getByRole('button',{name:'Collection',exact:true}).click();
    await expect(gallery.locator('[data-wave3-asset]')).toHaveCount(2);
    await gallery.locator('[data-wave3-asset="store-star"]').click();
    await expect(gallery.locator('[data-wave3-selected]')).toHaveAttribute('data-wave3-selected','store-star');
    const selectedArt = gallery.locator('[data-wave3-preview-image="store-star"] img[data-image="store-star-detail"]');
    await expect(selectedArt).toHaveAttribute('width', '72');
    await expect(selectedArt).toHaveAttribute('height', '72');
    await expect(selectedArt).toHaveJSProperty('naturalWidth', 216);
    await gallery.locator('[data-wave3-filter="store"]').click();
    await gallery.locator('[data-wave3-asset="store-cart"]').click();
    const cartArt = gallery.locator('[data-wave3-preview-image="store-cart"] img[data-image="store-cart-detail"]');
    await expect(cartArt).toHaveJSProperty('naturalWidth', 216);
    await expect(gallery.getByRole('button',{name:/buy now|purchase|claim|checkout/i})).toHaveCount(0);
    await test.info().attach(`garage-store-applied-${viewport.width}x${viewport.height}.png`, {
      body: await gallery.screenshot(), contentType: 'image/png',
    });
  }
  expect(errors).toEqual([]);
});

test('Store preview summary has bilingual art fallback without granting an Economy entitlement', async ({ page }) => {
  await page.route('**/feature-assets/garage-store-readiness/raster/store-collection@3x.webp', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  const entry = page.locator('#garage-art-source-garage-store-readiness summary');
  await expect(entry.getByRole('img',{name:'Collection art'})).toBeVisible();
  await entry.click();
  await expect(page.locator('[data-wave3-asset]')).toHaveCount(6);
  await page.locator('#garage-close').click();
  // No balance, ownership or checkout is unlocked by displaying source artwork.
  await expect(page.locator('#garage-screen')).not.toBeVisible();
});

test('failed selected Store concept image keeps readable text and no purchase CTA', async ({ page }) => {
  await page.route('**/feature-assets/garage-store-readiness/raster/store-star@3x.webp', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  const gallery = page.locator('#garage-art-source-garage-store-readiness');
  await gallery.locator('summary').click();
  await gallery.locator('[data-wave3-asset="store-star"]').click();
  const detail = gallery.locator('[data-wave3-preview-image="store-star"]');
  await expect(detail.getByRole('img', {name: 'Featured icon'})).toBeVisible();
  await expect(gallery.locator('[data-wave3-description]')).not.toBeEmpty();
  await expect(gallery.getByRole('button', {name: /buy|checkout|claim|pay/i})).toHaveCount(0);
});

test('Rewards/Missions source artwork is available at native 3x resolution with 1x CSS display without granting capabilities', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const source = page.locator('#garage-art-source-garage-rewards-and-missions');
  await expect(source).toBeVisible();
  await source.locator('summary').click();
  const thumbnails = source.locator('img');
  await expect(thumbnails).toHaveCount(8);
  const first = thumbnails.first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toHaveAttribute('width', '96');
  await expect(first).toHaveAttribute('height', '96');
  await expect(first).toHaveJSProperty('naturalWidth', 288);
  await expect(source).not.toContainText(/buy now|purchase|claim reward|立即購買|立即領取/i);
});

test('safe 3x Rewards/Missions reference cards never crop image or caption on desktop and phone', async ({ page }) => {
  for (const viewport of [{width:390,height:844}, {width:844,height:390}, {width:1440,height:900}]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const gallery = page.locator('#garage-art-source-garage-rewards-and-missions');
    await gallery.locator('summary').click();
    const cards = gallery.locator('.garage-badge-card');
    await expect(cards).toHaveCount(8);
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
      expect(v.native).toBe(288);
      expect(v.icon).toEqual([96,96]);
      expect(v.inside).toBe(true); expect(v.labelSafe).toBe(true);
      expect(v.width).toBeLessThanOrEqual(v.viewport);
    }
  }
});
