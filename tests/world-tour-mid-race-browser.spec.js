import { test, expect } from '@playwright/test';
const tracks={
  taipei:[3120,3450,6200],tokyo:[5050,5450,6800],
  alpine:[3850,4200,7600],coastal:[2950,3310,5800],
  cosmic:[6100,6540,8000],
};
for(const [id,[from,to,length]] of Object.entries(tracks)){
  test(`${id}: three-dimensional driving world remains live before, during, and after the tunnel`,async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/tests/fixtures/world-tour-mid-race.html');
    await page.waitForFunction(()=>window.worldTourReady===true);
    const positions=[0,length*.25,from-40,from+6,(from+to)/2,to+5,to+200,length*.94];
    for(const distance of positions){
      const response=await page.evaluate(([name,d])=>window.worldTourProbe(name,d),[id,distance]);
      expect(response.id).toBe(id);
      expect(response.distance).toBeGreaterThanOrEqual(0);
      await page.waitForTimeout(90);
    }
    // Long-running RAF render checks the actual failure path around each
    // energy tunnel instead of taking only one isolated mid-race screenshot.
    const sweep=await page.evaluate(([name,from,to])=>
      window.worldTourSweep(name,from-180,to+180,180),[id,from,to]);
    expect(sweep.arrivedAt).toBe(to+180);
    expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath(`world-tour-${id}-mid-race.png`),animations:'disabled'});
  });
}
