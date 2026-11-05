import { test, expect } from './helpers/test.js';

for (const pageName of ['home', 'studio']) {
  test(`Garage ${pageName} uses source-art animation without replacing live 3D`, async ({ page }) => {
    await page.goto('/');
    await page.locator('#garage-button').click();
    if (pageName === 'studio') await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-preview #world')).toBeVisible();
    for (const [selector, name, px] of [
      ['[data-skin="thruster-basic"] .garage-vfx-art img', 'thruster-basic', 288],
      ['#garage-vfx-art-badges .garage-badge-art-frame img', 'badge-equipped', 216],
    ]) {
      const image = page.locator(selector).first();
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute('data-animation-active', 'true');
      await expect(image).toHaveAttribute('src', new RegExp('garage-animated/' + name + '@3x\\.gif$'));
      await expect(image).toHaveJSProperty('naturalWidth', px);
      await expect(image).toHaveJSProperty('naturalHeight', px);
      await expect(image).toHaveAttribute('data-static-src', /raster\//);
    }
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

test('all 39 Garage, badge and Store cards map to their own source-art GIFs on Home and Studio', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-art-source-garage-store-readiness summary').click();
  const readCards = async () => {
    const skin = await page.locator('#garage-vfx-catalog [data-skin]').evaluateAll(cards =>
      cards.map(card => ({ id: card.dataset.skin, src: card.querySelector('img')?.dataset.animatedSrc })));
    const badges = await page.locator('#garage-vfx-art-badges [data-badge-art]').evaluateAll(cards =>
      cards.map(card => ({ id: card.dataset.badgeArt, src: card.querySelector('img')?.dataset.animatedSrc })));
    const store = await page.locator('#garage-art-source-garage-store-readiness [data-wave3-asset]').evaluateAll(cards =>
      cards.map(card => ({ id: card.dataset.wave3Asset, src: card.querySelector('img')?.dataset.animatedSrc })));
    expect([skin.length, badges.length, store.length]).toEqual([22, 11, 6]);
    const combined = [...skin, ...badges, ...store];
    expect(new Set(combined.map(item => item.id)).size).toBe(39);
    for (const item of combined) {
      expect(item.src, `Missing independent original-art motion for ${item.id}`)
        .toMatch(new RegExp(`garage-animated/${item.id}@3x\\.gif$`));
    }
  };
  await readCards();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('#garage-preview #world')).toBeVisible();
  await readCards();
});
