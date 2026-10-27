import { test, expect } from './helpers/test.js';

// Screenshots are of the actual running WebGL renderer, not synthetic design
// comps. SwiftShader in CI is not a physical phone GPU.
const sizes=[
  {width:1440,height:900,quality:'high'},
  {width:390,height:844,quality:'medium'},
  {width:320,height:740,quality:'low'},
  {width:844,height:390,quality:'medium'},
];
for (const {width,height,quality} of sizes) {
  test(`Coast visual evidence ${width}x${height} (${quality})`, async({page},info)=>{
    await page.setViewportSize({width,height});
    await page.addInitScript(tier=>{
      localStorage.setItem('skyline-rush-vfx',JSON.stringify({quality:tier,preset:'cinematic',enabled:true}));
      localStorage.setItem('skyline-rush-music','off');
    },quality);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/?perf');
    await expect(page.locator('#start-button')).toBeVisible();
    if(await page.locator('#music-prompt').isVisible())await page.locator('#music-no').click();
    await page.screenshot({path:info.outputPath(`coast-visual-before-race-${width}x${height}.png`),animations:'disabled'});
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    const meter=page.locator('#perf-overlay');
    await expect(meter).toContainText('FRAME p50');
    await page.waitForTimeout(1800);
    const stats=await meter.textContent();
    await page.screenshot({path:info.outputPath(`coast-visual-racing-${width}x${height}.png`),animations:'disabled'});
    const load=await meter.evaluate(node=>({...node.dataset}));
    console.log('COAST_WEBGL_EVIDENCE '+JSON.stringify({width,height,quality,stats,load,renderer:'CI software-WebGL'}));
    expect(Number(load.drawCalls)).toBeGreaterThan(0);
    expect(Number(load.triangles)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}
