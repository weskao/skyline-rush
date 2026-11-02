import { test, expect } from './helpers/test.js';
test('all 18 3x original HUD/control images are accessible at 1x CSS in Settings', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settings-button').click();
  const gallery = page.locator('#hud-3x-source-gallery');
  await expect(gallery).toBeVisible();
  await gallery.locator('summary').click();
  const icons = gallery.locator('img');
  await expect(icons).toHaveCount(18);
  const wide = gallery.locator('img[data-image="button-back"]');
  const small = gallery.locator('img[data-image="hud-brake"]');
  await wide.scrollIntoViewIfNeeded();
  await expect(wide).toHaveAttribute('width', '144');
  await expect(wide).toHaveAttribute('height', '52');
  await expect(wide).toHaveJSProperty('naturalWidth', 432);
  await small.scrollIntoViewIfNeeded();
  await expect(small).toHaveAttribute('width', '72');
  await expect(small).toHaveAttribute('height', '72');
  await expect(small).toHaveJSProperty('naturalWidth', 216);
  await expect(page.locator('#touch-controls')).toBeHidden();
  await expect(gallery).not.toContainText(/enable purchase|claim reward|立即購買/i);
});

test('original 3x images decorate functional Nitro, Brake, Pause and Play buttons without stealing input', async ({ page }) => {
  await page.goto('/');
  for (const [selector, filename, cssWidth] of [
    ['#start-button', 'button-play', '144'],
    ['#garage-button', 'button-garage', '144'],
    ['#pause-button', 'hud-pause', '72'],
    ['[data-control="nitro"]', 'button-nitro', '144'],
    ['[data-control="brake"]', 'hud-brake', '72'],
    ['[data-control="left"]', 'ui-arrow-left', '72'],
    ['[data-control="right"]', 'ui-arrow-right', '72'],
  ]) {
    const image = page.locator(selector + ' img.hud-3x-decor');
    await expect(image).toHaveAttribute('src', new RegExp(filename + '@3x\\.webp$'));
    await expect(image).toHaveAttribute('width', cssWidth);
    await expect(image).toHaveAttribute('aria-hidden', 'true');
    await expect(image).toHaveCSS('pointer-events', 'none');
  }
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen')).toBeVisible();
});

test('all 18 artwork cards preserve native 3x pixels, visible icons and labels on phone and desktop', async ({ page }) => {
  for (const viewport of [{width:390,height:844}, {width:844,height:390}, {width:1440,height:900}]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#settings-button').click();
    const gallery = page.locator('#hud-3x-source-gallery');
    await gallery.locator('summary').click();
    const cards = gallery.locator('.garage-badge-card');
    await expect(cards).toHaveCount(18);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      const v = await card.evaluate(figure => {
        const img = figure.querySelector('img');
        const f = figure.querySelector('.garage-badge-art-frame').getBoundingClientRect();
        const i = img.getBoundingClientRect();
        const c = figure.querySelector('figcaption').getBoundingClientRect();
        const wide = img.dataset.image.startsWith('button-');
        return { native: [img.naturalWidth,img.naturalHeight],
          display: [i.width,i.height], expected: wide ? [144,52] : [72,72],
          source: wide ? [432,156] : [216,216],
          inside: f.left<=i.left && i.right<=f.right && f.top<=i.top && i.bottom<=f.bottom,
          captionSafe: c.top>=f.bottom+4, viewportSafe: figure.getBoundingClientRect().right<=innerWidth };
      });
      expect(v.native).toEqual(v.source); expect(v.display).toEqual(v.expected);
      expect(v.inside).toBe(true); expect(v.captionSafe).toBe(true);
      expect(v.viewportSafe).toBe(true);
    }
  }
});


test('decorative HUD original 3x images fit button hit regions without image clipping', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  for (const selector of ['#garage-button', '#start-button', '#pause-button',
    '[data-control="nitro"]', '[data-control="brake"]', '[data-control="left"]', '[data-control="right"]']) {
    const btn = page.locator(selector), img = btn.locator('img.hud-3x-decor');
    const result = await img.evaluate(node => {
      const a = node.getBoundingClientRect(), b = node.parentElement.getBoundingClientRect();
      return { within: a.left >= b.left - 1 && a.right <= b.right + 1 &&
        a.top >= b.top - 1 && a.bottom <= b.bottom + 1, hit: getComputedStyle(node).pointerEvents };
    });
    expect(result.within, selector).toBe(true);
    expect(result.hit).toBe('none');
  }
});
