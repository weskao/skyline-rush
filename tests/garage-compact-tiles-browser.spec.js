import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

// Compact Garage tiles: VFX loadout, badge/rarity gallery and trophy showcase.
// Less scrolling, but every artwork keeps its native 1x size and no tile is clipped.
// shortcut: local copies of COMPACT_VIEWPORTS/measureCards from garage-vfx-catalog-browser.spec.js;
// merge both into one shared helper once the parallel mission-card branch has landed.
// Before: loadout 178, badge 156-165, trophy 160-162px; after 167-182, 126-146, 147px (a few px of CI font slack).
const LOADOUT_MAX = 186, BADGE_MAX = 150, TROPHY_MAX = 152;
const COMPACT_VIEWPORTS = [[320, 568], [360, 740], [390, 844], [430, 932], [768, 1024], [844, 390], [1024, 768], [1440, 900]];
const measureCards = cards => cards.evaluateAll(els => {
  const list = els[0].parentElement.getBoundingClientRect(), boxes = els.map(el => el.getBoundingClientRect());
  return { listWidth: list.width, perRow: boxes.filter(b => Math.round(b.top) === Math.round(boxes[0].top)).length,
    rows: new Set(boxes.map(b => Math.round(b.top))).size, tallest: Math.max(...boxes.map(b => b.height)),
    inside: boxes.every(b => b.left >= list.left - 1 && b.right <= list.right + 1),
    unclipped: els.every(el => el.scrollWidth <= el.clientWidth),
    // offsetWidth is the layout size: hover/rotate animations transform the visual box, not this.
    art: els.map(el => [el.querySelector('img').offsetWidth, el.querySelector('img').offsetHeight]),
    captionBelow: els.every(el => el.querySelector('figcaption, strong').getBoundingClientRect().top
      >= el.querySelector('img').getBoundingClientRect().bottom - 6) };
});

for (const locale of ['en', 'zh-TW']) for (const [width, height] of COMPACT_VIEWPORTS) {
  test(`loadout, badge and trophy tiles stay compact with native art at ${width}x${height} ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    if (locale === 'zh-TW') await selectLocale(page, locale);
    await page.locator('#garage-button').click();

    const sections = { loadout: '#garage-vfx-live-loadout', badge: '#garage-vfx-art-badges', trophy: '.garage-mission-board .garage-trophy-grid' };
    const tiles = { loadout: '.garage-vfx-loadout-tile', badge: '.garage-badge-card', trophy: '.garage-trophy-card' };
    const m = {};
    for (const key of Object.keys(sections)) {
      const section = page.locator(sections[key]);
      await section.evaluate(el => el.scrollIntoView({ block: 'center' }));
      // Lazy art decodes once scrolled in; wait for it so the screenshot shows the real tiles.
      await expect.poll(() => section.locator('img').evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0)),
        { message: `${key} art decoded` }).toBe(true);
      m[key] = await measureCards(section.locator(tiles[key]));
      const shot = test.info().outputPath(`${key}-${width}x${height}-${locale}.png`);
      await section.screenshot({ path: shot });
      await test.info().attach(`${key}-${width}x${height}-${locale}.png`, { path: shot, contentType: 'image/png' });
    }
    const { loadout, badge, trophy } = m;
    console.log(JSON.stringify({ width, height, locale, ...m }, (k, v) => k === 'art' ? undefined : v));
    expect(loadout.art, 'loadout art keeps its native 1x size').toEqual(Array(4).fill([96, 96]));
    // Four tiles read as a 2x2 block everywhere, including the ~240px column beside the tablet 3D preview.
    expect([loadout.perRow, loadout.rows], 'loadout tiles per row, rows').toEqual([2, 2]);
    expect(loadout.tallest, 'loadout tile height').toBeLessThanOrEqual(LOADOUT_MAX);
    expect([loadout.inside, loadout.unclipped], 'loadout tiles fit their grid').toEqual([true, true]);

    expect(badge.art, 'badge art keeps its native 1x size').toEqual(Array(11).fill([72, 72]));
    expect(badge.perRow, 'badge cards per row').toBeGreaterThanOrEqual(badge.listWidth >= 324 ? 3 : 2);
    expect(badge.tallest, 'badge card height').toBeLessThanOrEqual(BADGE_MAX);
    expect([badge.inside, badge.unclipped, badge.captionBelow], 'badge cards fit, caption below art').toEqual([true, true, true]);

    // raster-artwork.md: trophies never shrink below 96px, also with zh-TW captions in narrow columns.
    expect(trophy.art, 'trophy art keeps its native 1x size').toEqual(Array(4).fill([96, 96]));
    expect([trophy.perRow, trophy.rows], 'trophy cards per row, rows').toEqual([2, 2]);
    expect(trophy.tallest, 'trophy card height').toBeLessThanOrEqual(TROPHY_MAX);
    expect([trophy.inside, trophy.unclipped, trophy.captionBelow], 'trophy cards fit, caption below art').toEqual([true, true, true]);
  });
}
