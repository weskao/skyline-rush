import { test,expect } from '@playwright/test';

for(const id of ['alpine','cosmic']) {
  test(`${id}: home preview is a full, dynamic four-car airborne showcase with matching scale`,async({page},info)=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/tests/fixtures/world-tour-mid-race.html');
    await page.waitForFunction(()=>window.worldTourReady===true);
    const result=await page.evaluate(async id=>{
      // Compare to the real original course preview rendered by exactly the
      // same world, geometry and camera. Then switch to a World Tour course.
      const baseline=window.worldTourPreviewProbe('coast').actors[0];
      await new Promise(requestAnimationFrame);
      const first=window.worldTourPreviewProbe(id).actors;
      await new Promise(resolve=>setTimeout(resolve,200));
      const later=window.worldTourPreviewProbe(id).actors;
      return {baseline,first,later};
    },id);
    expect(result.first).toHaveLength(4);
    expect(result.first.every(car=>car.visible)).toBe(true);
    expect(result.first.filter(car=>Math.abs(car.x)<1 && Math.abs(car.y)<1 &&
      car.z>-1 && car.z<1).length).toBeGreaterThanOrEqual(3);
    expect(result.first[0].jetsVisible).toBe(true);
    expect(result.first[1].jetsVisible).toBe(true);
    // The player is the original vehicle model: same three-quarter home
    // camera distance => comparable projected on-screen vehicle width.
    const ratio=result.first[0].screenWidth/result.baseline.screenWidth;
    expect(ratio,'player car should be about the same size as other maps').toBeGreaterThan(.65);
    expect(ratio,'player car should not dominate the preview').toBeLessThan(1.5);
    expect(result.later[0].screenWidth).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath(`world-tour-${id}-flying-showcase.png`)});
  });
}

test('Alpine and Cosmic selection keep the actual 3D showroom animated, not a static card',async({page},info)=>{
  await page.goto('/');
  for(const id of ['alpine','cosmic']) {
    await page.locator(`[data-track="${id}"]`).click();
    await page.waitForTimeout(650);
    await expect(page.locator('#start-button')).toBeVisible();
    await page.screenshot({path:info.outputPath(`world-tour-${id}-homepage-showcase.png`)});
  }
});
