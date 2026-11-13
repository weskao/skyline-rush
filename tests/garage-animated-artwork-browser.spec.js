import { test, expect } from './helpers/test.js';

for (const pageName of ['home', 'studio']) {
  test(`Garage ${pageName} uses source-art animation without replacing live 3D`, async ({ page }) => {
    await page.goto('/');
    await page.locator('#garage-button').click();
    if (pageName === 'studio') await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    const image = page.locator('[data-skin="thruster-basic"] .garage-vfx-art img').first();
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('data-animation-active', 'true');
    await expect(image).toHaveAttribute('src', /garage-animated\/thruster-basic@3x\.gif$/);
    await expect(image).toHaveJSProperty('naturalWidth', 288);
    await expect(image).toHaveJSProperty('naturalHeight', 288);
    await expect(image).toHaveAttribute('data-static-src', /raster\//);
    // A badge is a pure specular sweep: original 3x art stays, CSS draws the light.
    const badge = page.locator('#garage-vfx-art-badges [data-badge-art="badge-equipped"]');
    await badge.scrollIntoViewIfNeeded();
    await expect(badge.locator('img')).toHaveAttribute('data-animation-active', 'false');
    await expect(badge.locator('img')).toHaveAttribute('src', /raster\/badge-equipped@3x\.(png|webp)$/);
    await expect(badge.locator('img')).toHaveJSProperty('naturalWidth', 216);
    await expect.poll(() => badge.locator('.garage-art-sweep').evaluate(el =>
      getComputedStyle(el, '::after').animationDuration)).toBe('6.8s');
    await expect(page.locator('#garage-preview #world')).toBeVisible();
  });
}

test('Garage store concepts animate each original gift box while retaining original fallback', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const source = page.locator('#garage-art-source-garage-store-readiness');
  await source.locator('summary').click();
  const box = source.locator('[data-wave3-asset="store-box"] img');
  await box.scrollIntoViewIfNeeded();
  await expect(box).toHaveAttribute('data-animation-active', 'true');
  await expect(box).toHaveAttribute('src', /garage-animated\/store-box@3x\.gif$/);
  await expect(box).toHaveJSProperty('naturalWidth', 216);
  await expect(box).toHaveAttribute('data-static-src', /garage-store-readiness\/raster\/store-box@3x\.webp$/);
});

test('reduced-motion displays untouched original static assets, never animating GIF', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#garage-button').click();
  const icon = page.locator('[data-skin="thruster-basic"] .garage-vfx-art img');
  await icon.scrollIntoViewIfNeeded();
  await expect(icon).toHaveAttribute('data-animation-active', 'false');
  await expect(icon).toHaveAttribute('src', /raster\/thruster-basic@3x\.webp$/);
  await expect(icon).toHaveJSProperty('naturalWidth', 288);
});

test('failed GIF falls back to source WebP without changing equipped state', async ({ page }) => {
  await page.route('**/garage-animated/thruster-ion@3x.gif', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  const skin = page.locator('[data-skin="thruster-ion"]');
  const icon = skin.locator('img');
  await icon.scrollIntoViewIfNeeded();
  await expect(icon).toHaveAttribute('data-animation-active', 'false');
  await expect(icon).toHaveAttribute('src', /raster\/thruster-ion@3x\.webp$/);
  await expect(skin).toHaveAttribute('data-owned', 'false');
});

test('25 part-motion cards map to their own GIFs; 14 sweep cards share one CSS sweep on Home and Studio', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-art-source-garage-store-readiness summary').click();
  const readCards = async () => {
    const skin = await page.locator('#garage-vfx-catalog [data-skin]').evaluateAll(cards =>
      cards.map(card => ({ id: card.dataset.skin, src: card.querySelector('img')?.dataset.animatedSrc,
        sweep: card.querySelector('.garage-art-sweep') && getComputedStyle(card.querySelector('.garage-art-sweep'), '::after').animationDuration })));
    const badges = await page.locator('#garage-vfx-art-badges [data-badge-art]').evaluateAll(cards =>
      cards.map(card => ({ id: card.dataset.badgeArt, src: card.querySelector('img')?.dataset.animatedSrc,
        sweep: card.querySelector('.garage-art-sweep') && getComputedStyle(card.querySelector('.garage-art-sweep'), '::after').animationDuration })));
    const store = await page.locator('#garage-art-source-garage-store-readiness [data-wave3-asset]').evaluateAll(cards =>
      cards.map(card => ({ id: card.dataset.wave3Asset, src: card.querySelector('img')?.dataset.animatedSrc,
        sweep: card.querySelector('.garage-art-sweep') && getComputedStyle(card.querySelector('.garage-art-sweep'), '::after').animationDuration })));
    expect([skin.length, badges.length, store.length]).toEqual([22, 11, 6]);
    const combined = [...skin, ...badges, ...store];
    expect(new Set(combined.map(item => item.id)).size).toBe(39);
    const swept = /^(badge-|rarity-)|^store-(cart|star|tag)$/;
    for (const item of combined) {
      if (swept.test(item.id)) {
        expect(item.src, `${item.id} is a CSS sweep, not a GIF`).toBeUndefined();
        expect(item.sweep, `${item.id} sweep cycle`).toBe('6.8s');
      } else {
        expect(item.src, `Missing independent original-art motion for ${item.id}`)
          .toMatch(new RegExp(`garage-animated/${item.id}@3x\\.gif$`));
      }
    }
    expect(combined.filter(item => item.src).length).toBe(25);
  };
  await readCards();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('#garage-preview #world')).toBeVisible();
  await readCards();
});

test('VFX Off and Low use the static original art; returning to High resumes only the GIF', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  const skin = page.locator('[data-skin="thruster-basic"]');
  const icon = skin.locator('.garage-vfx-art img');
  await icon.scrollIntoViewIfNeeded();
  const owned = await skin.getAttribute('data-owned');
  await expect(icon).toHaveAttribute('data-animation-active', 'true');
  await page.evaluate(() => { document.body.dataset.vfxEnabled = 'false'; });
  await expect(icon).toHaveAttribute('data-animation-active', 'false');
  await expect(icon).toHaveAttribute('src', /raster\/thruster-basic@3x\.webp$/);
  await page.evaluate(() => {
    document.body.dataset.vfxEnabled = 'true';
    document.body.dataset.vfxQuality = 'low';
  });
  await expect(icon).toHaveAttribute('data-animation-active', 'false');
  await page.evaluate(() => { document.body.dataset.vfxQuality = 'high'; });
  await expect(icon).toHaveAttribute('data-animation-active', 'true');
  await expect(skin).toHaveAttribute('data-owned', owned ?? 'false');
});
