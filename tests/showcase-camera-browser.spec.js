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

for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:568},{width:760,height:501},{width:768,height:1024},{width:844,height:390}]) {
  test(`home camera dock stays interactive at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#showcase-camera-next')).toBeVisible();
    for (const locale of ['en', 'zh-TW']) {
      await page.locator('#locale-select').selectOption(locale, { force: true });
      const camera = await page.locator('#showcase-camera-dock').boundingBox();
      for (const selector of ['#start-button', '#practice-button', '.history-button', '#garage-button', '#daily-card-start']) {
        const control = await page.locator(selector).boundingBox();
        const overlaps = camera.x < control.x + control.width && control.x < camera.x + camera.width &&
          camera.y < control.y + control.height && control.y < camera.y + camera.height;
        expect(overlaps, `${locale}: camera covers ${selector}`).toBe(false);
      }
    }
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


// Regression: AIRFLOW anchors Start near the bottom; the camera dock must sit above it,
// not merely remain clickable while overlapping the button (especially on phones).
for (const [width, height] of [[320, 568], [390, 844], [760, 501], [768, 1024], [844, 390], [1440, 900]]) {
  test(`AIRFLOW camera dock stays above Start with breathing room at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#airflow-toggle').click();
    await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed', 'true');

    for (const locale of ['en', 'zh-TW']) {
      await page.locator('#locale-select').selectOption(locale, { force: true });
      const [camera, start] = await Promise.all([
        page.locator('#showcase-camera-dock').boundingBox(),
        page.locator('#start-button').boundingBox(),
      ]);
      expect(camera.y, `${width}x${height} ${locale}: camera off-screen`).toBeGreaterThanOrEqual(0);
      expect(camera.x, `${width}x${height} ${locale}: camera off-screen`).toBeGreaterThanOrEqual(0);
      expect(camera.x + camera.width, `${width}x${height} ${locale}: camera clipped`).toBeLessThanOrEqual(width);
      expect(camera.y + camera.height + 18, `${width}x${height} ${locale}: camera overlaps Start`)
        .toBeLessThanOrEqual(start.y + 0.5);
    }

    await page.locator('#showcase-camera-next').click();
    await expect(page.locator('#showcase-camera-dock')).toHaveAttribute('data-view', 'front');
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  });
}
