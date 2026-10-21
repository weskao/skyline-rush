import { test,expect } from '@playwright/test';
const ids=['alpine','cosmic'];
for(const id of ids) {
  test(`${id} ready-screen camera visibly frames the player and multiple grounded rivals`,async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/tests/fixtures/world-tour-mid-race.html');
    await page.waitForFunction(()=>window.worldTourReady===true);
    const result=await page.evaluate(name=>window.worldTourPreviewProbe(name),id);
    expect(result.actors).toHaveLength(4);
    expect(result.actors.every(a=>a.visible)).toBeTruthy();
    // A true NDC viewport intersection proves they are not placed outside
    // the preview camera, as happened with Alpine and Cosmic before.
    expect(result.actors.filter(a=>Math.abs(a.x)<1&&Math.abs(a.y)<1&&a.z<1&&a.z>-1).length).toBeGreaterThanOrEqual(3);
    expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath(`${id}-showcase-with-four-cars.png`)});
  });
}
