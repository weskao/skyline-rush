import { test, expect } from './helpers/test.js';
import { RACE_TRACKS } from '../src/game.js';

test('ready screen offers a discoverable camera dock across all tracks',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#showcase-camera-dock')).toBeVisible();
  for(const id of Object.keys(RACE_TRACKS)){
    await page.locator(`[data-track="${id}"]`).click();
    await expect(page.locator('#showcase-camera-dock')).toBeVisible();
    await page.locator('#showcase-camera-next').click();
    await expect(page.locator('#showcase-camera-dock')).toHaveAttribute('data-view',/front|rear|left|right|orbit|drive/);
  }
});

test('desktop camera control is not covered by the device quality notice',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  const notice=page.locator('#performance-notice');
  const button=page.locator('#showcase-camera-next');
  await expect(notice).toBeVisible();
  const a=await notice.boundingBox(), b=await button.boundingBox();
  const overlaps=a.x < b.x+b.width && b.x < a.x+a.width &&
    a.y < b.y+b.height && b.y < a.y+a.height;
  expect(overlaps,'The first-launch performance notice must not cover the camera controls').toBe(false);
  await button.click();
  await expect(page.locator('#showcase-camera-dock')).toHaveAttribute('data-view','front');
});

test('home camera cycles independently of AIRFLOW and follows language changes',async({page})=>{
  await page.goto('/');
  const dock=page.locator('#showcase-camera-dock');
  await expect(dock).toHaveAttribute('data-view','drive');
  await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed','false');
  await page.locator('#showcase-camera-next').click();
  await expect(dock).toHaveAttribute('data-view','front');
  await expect(page.locator('#showcase-camera-name')).toContainText('Front');
  await page.locator('#showcase-camera-prev').click();
  await expect(dock).toHaveAttribute('data-view','drive');
  await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed','false');
});

for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]) {
  test(`home camera dock stays interactive at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#showcase-camera-next')).toBeVisible();
    await page.locator('#showcase-camera-next').click();
    await expect(page.locator('#showcase-camera-dock')).toHaveAttribute('data-view','front');
  });
}

const worldTourMaps=['taipei','tokyo','alpine','coastal','cosmic'];
for(const id of worldTourMaps) {
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    test(`${id}: AIRFLOW on-road preview keeps every camera button usable at ${viewport.width}px`,async({page},info)=>{
      await page.setViewportSize(viewport);
      await page.addInitScript(()=>{
        localStorage.setItem('skyline-rush-unlocked',JSON.stringify(['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic']));
        localStorage.setItem('skyline-rush-music','off');
      });
      await page.goto('/');
      await page.locator(`[data-track="${id}"]`).click();
      const airflow=page.locator('#airflow-toggle');
      await airflow.click(); // never force-click past an overlay
      await expect(airflow).toHaveAttribute('aria-pressed','true');
      const dock=page.locator('#showcase-camera-dock');
      await expect(dock).toBeVisible();
      for(const mode of ['front','rear','left','right','orbit','drive']) {
        await page.locator('#showcase-camera-next').click();
        await expect(dock).toHaveAttribute('data-view',mode);
      }
      await page.screenshot({path:info.outputPath(`${id}-airflow-${viewport.width}.png`),animations:'disabled'});
      await airflow.click();
      await expect(airflow).toHaveAttribute('aria-pressed','false');
    });
  }
}
