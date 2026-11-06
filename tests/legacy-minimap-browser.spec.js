import { test, expect } from './helpers/test.js';
import { RACE_TRACKS } from '../src/game.js';
const ids = ['coast','neon','canyon','aurora','spiral'];
const ROUTE = 'polyline.route-overview-line';
// Only Sky Spiral adds decorative upper-loop and heading overlays; any other line would be an extra route such as a shortcut.
const EXTRA = 'polyline:not(.route-overview-line):not(.route-spiral-upper):not(.route-spiral-direction)';
const seed = page => page.addInitScript(trackIds => {
  localStorage.setItem('skyline-rush-unlocked',JSON.stringify(Object.keys(trackIds)));
  localStorage.setItem('skyline-rush-music','off');
},RACE_TRACKS);

test('all five original courses show their complete, curved route outline on the home screen',async({page})=>{
  await seed(page);
  await page.goto('/');
  for(const id of ids){
    const card=page.locator(`[data-track="${id}"]`);
    const map=card.locator('.track-route-map');
    const line=map.locator(`svg ${ROUTE}`);
    await expect(map).toBeVisible();
    await expect(line).toHaveAttribute('points',/^\d/);
    const geometry=await line.evaluate(el=>{
      const b=el.getBBox(),r=el.closest('svg').getBoundingClientRect();
      return {width:b.width,height:b.height,mapWidth:r.width,mapHeight:r.height};
    });
    expect(geometry.width,`${id} must show legible turns`).toBeGreaterThan(48);
    expect(geometry.height,`${id} must show full main route`).toBeGreaterThan(23);
    expect(geometry.mapWidth,`${id} SVG must have a visible width`).toBeGreaterThan(35);
    expect(geometry.mapHeight,`${id} SVG must have a visible height`).toBeGreaterThan(22);
    await expect(map.locator(ROUTE)).toHaveCount(1);
    await expect(map.locator(EXTRA)).toHaveCount(0);
    await expect(map.locator('polyline')).toHaveCount(id === 'spiral' ? 3 : 1);
  }
});
for(const id of ids)test(`${id}: race minimap has a visible main path and all eight racer indicators`,async({page})=>{
  await seed(page);
  await page.goto('/');
  await page.locator(`[data-track="${id}"]`).click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  const map=page.locator('#race-route-map');
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-theme',id);
  await expect(map.locator(`svg ${ROUTE}`)).toHaveCount(1);
  await expect(map.locator(`svg ${EXTRA}`)).toHaveCount(0);
  await expect(map.locator('polyline')).toHaveCount(id === 'spiral' ? 3 : 1);
  await expect(map.locator('circle[data-racer]')).toHaveCount(8);
  const shape=await map.locator(ROUTE).evaluate(el=>({w:el.getBBox().width,h:el.getBBox().height}));
  expect(shape.w).toBeGreaterThan(48);
  expect(shape.h).toBeGreaterThan(23);
});
for(const [width,height] of [[390,844],[320,568],[844,390]]){
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
