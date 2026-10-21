import { test, expect } from '@playwright/test';
import { RACE_TRACKS } from '../src/game.js';
const ids = ['coast','neon','canyon','aurora','spiral'];
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
    const line=map.locator('svg polyline');
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
    await expect(map.locator('polyline')).toHaveCount(1);
  }
});
for(const id of ids)test(`${id}: race minimap has a visible main path and all four racer indicators`,async({page})=>{
  await seed(page);
  await page.goto('/');
  await page.locator(`[data-track="${id}"]`).click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  const map=page.locator('#race-route-map');
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-theme',id);
  await expect(map.locator('svg polyline')).toHaveCount(1);
  await expect(map.locator('circle[data-racer]')).toHaveCount(4);
  const shape=await map.locator('polyline').evaluate(el=>({w:el.getBBox().width,h:el.getBBox().height}));
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
    await expect(map.locator('circle[data-racer]')).toHaveCount(4);
  });
}
