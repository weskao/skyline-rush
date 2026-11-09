import { test, expect } from './helpers/test.js';
import { RACE_TRACKS } from '../src/game.js';
const seed = page => page.addInitScript(trackIds => {
  localStorage.setItem('skyline-rush-unlocked',JSON.stringify(Object.keys(trackIds)));
  localStorage.setItem('skyline-rush-music','off');
},RACE_TRACKS);

// The route outline, race minimap shape and the 390x844 / 844x390 bounds are asserted for all five tracks in
// phase4-first-five-browser.spec.js; the narrowest 320x568 viewport is covered only here.
for(const [width,height] of [[320,568]]){
  test(`existing tracks keep the live minimap visible at ${width}x${height}`,async({page})=>{
    await seed(page);
    await page.setViewportSize({width,height});
    await page.goto('/');
    await page.locator('#start-button').click();
    const map=page.locator('#race-route-map');
    await expect(map).toBeVisible();
    const r=await map.boundingBox();
    expect(r).not.toBeNull();
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x+r.width).toBeLessThanOrEqual(width+1);
    expect(r.y+r.height).toBeLessThanOrEqual(height+1);
    await expect(map.locator('circle[data-racer]')).toHaveCount(8);
  });
}

// The player must be findable at a glance: an arrow pointing along the route, clearly larger
// than any rival dot and in a colour no rival uses.
const startRace = async (page, width, height) => {
  await seed(page);
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  return page.locator('#race-route-map');
};
for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
  test(`player minimap marker is a larger, differently shaped arrow at ${width}x${height}`, async ({ page }) => {
    const map = await startRace(page, width, height);
    await expect(map).toBeVisible();
    const pointer = map.locator('.route-player-pointer');
    await expect(pointer).toHaveAttribute('visibility', 'visible');
    await expect(pointer).toHaveAttribute('transform', /^translate\(-?[\d.]+ -?[\d.]+\) rotate\(-?\d+\)$/);
    const decodedArtwork = await map.evaluate(async root => {
      const href = root.querySelector('.route-player-art')?.getAttribute('href');
      if (!href) return null;
      const image = new Image();
      image.src = href;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    });
    expect(decodedArtwork, 'the transparent player WebP loads on the active map').toEqual([96, 96]);
    const size = await map.evaluate(root => {
      const rect = selector => root.querySelector(selector).getBoundingClientRect();
      const fill = el => getComputedStyle(el).fill;
      const arrow = rect('.route-player-arrow'), rival = rect('[data-racer="NOVA"]');
      const rivalFills = [...root.querySelectorAll('[data-racer]:not([data-racer="YOU"])')].map(fill);
      return { arrow: Math.max(arrow.width, arrow.height), rival: rival.width,
        arrowFill: fill(root.querySelector('.route-player-arrow')), rivalFills };
    });
    expect(size.arrow, 'arrow is clearly bigger than a rival dot').toBeGreaterThan(size.rival * 1.5);
    for (const fill of size.rivalFills) expect(size.arrowFill).not.toBe(fill);
    // Same map box as before: the marker must not grow the HUD block.
    const box = await map.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
  });
}
test('player halo pulses with CSS and stops for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const map = await startRace(page, 1440, 900);
  const halo = map.locator('.route-player-halo');
  await expect(halo).toHaveCSS('animation-name', 'route-player-pulse');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(halo).toHaveCSS('animation-name', 'none');
});
