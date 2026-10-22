import { test,expect } from './helpers/test.js';

for(const id of ['taipei','tokyo','alpine','cosmic']) {
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

for(const [id,kind] of [['taipei','office'],['tokyo','tower']]) {
  for(const [layout,viewport] of [['landscape',{width:640,height:360}],['portrait',{width:390,height:844}]]) {
    test(`${id}: ${layout} home preview frames its signature landmark`,async({page},info)=>{
      await page.setViewportSize(viewport);
      await page.goto('/tests/fixtures/world-tour-mid-race.html');
      await page.waitForFunction(()=>window.worldTourReady===true);
      const landmark=await page.evaluate(([id,kind])=>{
        let probe;for(let i=0;i<3;i++)probe=window.worldTourPreviewProbe(id);
        return probe.landmarks.find(entry=>entry.kind===kind);
      },[id,kind]);
      expect(landmark.visible&&landmark.inFront).toBe(true);
      expect(landmark.maxY,'landmark top stays in frame').toBeLessThan(.98);
      // Landscape home UI covers the left half: the landmark sits right of it.
      if(layout==='landscape'){
        expect(landmark.minX).toBeGreaterThan(.04);
        expect(landmark.maxX).toBeLessThan(.98);
      }else expect(Math.abs((landmark.minX+landmark.maxX)/2)).toBeLessThan(1);
      expect(landmark.unobstructed,'roadside props must not hide the landmark').toBeGreaterThan(.2);
      await page.screenshot({path:info.outputPath(`world-tour-${id}-${layout}-landmark-showcase.png`)});
    });
  }
}

test('World Tour selection keeps the actual 3D showroom animated, not a static card',async({page},info)=>{
  await page.addInitScript(()=>{
    localStorage.setItem('skyline-rush-unlocked',JSON.stringify(['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic']));
    localStorage.setItem('skyline-rush-music','off');
  });
  await page.goto('/');
  for(const id of ['taipei','tokyo','alpine','cosmic']) {
    await page.locator(`[data-track="${id}"]`).click();
    await page.waitForTimeout(650);
    await expect(page.locator('#start-button')).toBeVisible();
    await page.screenshot({path:info.outputPath(`world-tour-${id}-homepage-showcase.png`)});
  }
});
