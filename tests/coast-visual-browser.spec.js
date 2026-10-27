import { test, expect } from './helpers/test.js';

// Both revisions run the identical production-built WebGL scene and input path.
// CI's SwiftShader is software rasterization, never physical mobile GPU evidence.
const baseline = process.env.COAST_BASELINE === '1';
const phase = baseline ? 'before' : 'after';
const sizes=[
  {width:1440,height:900,quality:'high'},
  {width:390,height:844,quality:'medium'},
  {width:320,height:740,quality:'low'},
  {width:844,height:390,quality:'medium'},
];
for (const {width,height,quality} of sizes) {
  test(`Coast ${phase} visual evidence ${width}x${height} (${quality})`, async({page},info)=>{
    await page.setViewportSize({width,height});
    await page.addInitScript(tier=>{
      localStorage.setItem('skyline-rush-vfx',JSON.stringify({quality:tier,preset:'cinematic',enabled:true}));
      localStorage.setItem('skyline-rush-music','off');
    },quality);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/?perf');
    await expect(page.locator('#world')).toBeVisible();
    await expect(page.locator('#start-button')).toBeVisible();
    if(await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.waitForTimeout(900);
    await page.screenshot({path:info.outputPath(`coast-visual-${phase}-showcase-${width}x${height}.png`),animations:'disabled'});
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    const meter=page.locator('#perf-overlay');
    await expect(meter).toContainText('FRAME p50');
    await page.waitForTimeout(1800);
    const stats=await meter.textContent();
    await page.screenshot({path:info.outputPath(`coast-visual-${phase}-racing-${width}x${height}.png`),animations:'disabled'});
    const load=await meter.evaluate(node=>({...node.dataset}));
    console.log('COAST_WEBGL_EVIDENCE '+JSON.stringify({
      phase,revision:baseline?'main:3788ca36':'phase2',width,height,quality,stats,load,
      renderer:'CI software-WebGL',hardware:false,
    }));
    if(!baseline) {
      expect(Number(load.drawCalls)).toBeGreaterThan(0);
      expect(Number(load.triangles)).toBeGreaterThan(0);
    }
    expect(errors).toEqual([]);
  });
}

// Additional camera coverage on the modified revision; A/B screenshots always
// use the same default drive shot and then the same in-race chase camera.
if (!baseline) {
  test('Coast six home camera modes and both locales remain usable',async({page})=>{
    await page.goto('/');
    const dock=page.locator('#showcase-camera-dock');
    for(const locale of ['en','zh-TW']){
      await page.locator('#locale-select').selectOption(locale,{force:true});
      for(const mode of ['front','rear','left','right','orbit','drive']){
        await page.locator('#showcase-camera-next').click();
        await expect(dock).toHaveAttribute('data-view',mode);
      }
    }
  });
  test('Coast reduced motion can start racing without hiding the car',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/');
    await expect(page.locator('#world')).toBeVisible();
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
  });
}
