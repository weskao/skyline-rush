import { test, expect } from './helpers/test.js';
import { RACE_TRACKS } from '../src/game.js';
import { PORTRAIT_CAR_TOP } from './showcase-car-zone.js';
import { selectLocale } from './helpers/locale-browser.js';
import { resizeTo } from './helpers/viewport.js';
import { ciTimeout } from './helpers/ci.js';

// CI: one app boot per layout family (about 11 s each on software WebGL). The telemetry card matrix and the five World Tour maps run
// inside one test each (test.step per size or map, the assertions of the former per-size tests). The dock tests stay one boot per size
// (an in-page resize lays the dock out differently from a fresh boot at 320x568, 760x501 and 768x1024), and the dock-to-Start
// checks end by starting a race. Boxes read by the former fresh-boot tests match the
// folded ones within 0.5 px (compared once before the per-size tests were removed).

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
// Desktop renders the biggest frames: two pages of at most three maps keep each folded test inside its budget.
for(const [viewport,maps] of [[{width:1440,height:900},worldTourMaps.slice(0,3)],[{width:1440,height:900},worldTourMaps.slice(3)],[{width:390,height:844},worldTourMaps]]) {
  test(`AIRFLOW on-road preview keeps every camera button usable at ${viewport.width}px: ${maps.join(', ')}`,async({page},info)=>{
    test.setTimeout(ciTimeout(100000));
    await page.setViewportSize(viewport);
    await page.addInitScript(()=>{
      localStorage.setItem('skyline-rush-unlocked',JSON.stringify(['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic']));
      localStorage.setItem('skyline-rush-music','off');
    });
    await page.goto('/');
    for(const id of maps) await test.step(id,async()=>{
      await page.locator(`[data-track="${id}"]`).click();
      const airflow=page.locator('#airflow-toggle');
      await airflow.click(); // never force-click past an overlay
      await expect(airflow,`${id}: AIRFLOW on`).toHaveAttribute('aria-pressed','true');
      const dock=page.locator('#showcase-camera-dock');
      await expect(dock).toBeVisible();
      for(const mode of ['front','rear','left','right','orbit','drive']) {
        await page.locator('#showcase-camera-next').click();
        await expect(dock,`${id}: next camera is ${mode}`).toHaveAttribute('data-view',mode);
      }
      await page.screenshot({path:info.outputPath(`${id}-airflow-${viewport.width}.png`),animations:'disabled'});
      await airflow.click();
      await expect(airflow,`${id}: AIRFLOW off`).toHaveAttribute('aria-pressed','false');
    });
  });
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

// Portrait phones: the showcase car fills the middle of the screen edge to edge, so the AIRFLOW
// telemetry card must sit in the sky band above it (the car side of the line is in showcase-camera-views-browser.spec.js).
test('AIRFLOW telemetry card stays above the showcase car at every portrait phone size and top inset', async ({ page }) => {
  test.setTimeout(ciTimeout(90000));
  const cases = [[320, 568, 0], [390, 844, 0], [390, 844, 59], [430, 932, 59]];
  await page.setViewportSize({ width: cases[0][0], height: cases[0][1] });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#airflow-toggle').click();
  await expect(page.locator('#airflow-hud')).toHaveAttribute('aria-hidden', 'false');
  const overlaps = (a, b) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
  for (const [width, height, top] of cases) await test.step(`${width}x${height}, top inset ${top}`, async () => {
    if (width !== cases[0][0] || height !== cases[0][1] || top) await resizeTo(page, width, height, { top, bottom: top ? 34 : 0, left: 0, right: 0 });
    for (const locale of ['en', 'zh-TW']) {
      await page.locator('#locale-select').selectOption(locale, { force: true });
      await expect(page.locator('#airflow-hud')).toHaveCSS('opacity', '1');
      const card = await page.locator('#airflow-hud').boundingBox();
      const label = `${width}x${height} inset ${top} ${locale}`;
      expect(card.y + card.height, `${label}: card reaches down onto the car`).toBeLessThanOrEqual(height * PORTRAIT_CAR_TOP);
      expect(card.x, `${label}: card off-screen`).toBeGreaterThanOrEqual(0);
      expect(card.x + card.width, `${label}: card clipped`).toBeLessThanOrEqual(width);
      for (const control of await page.locator('.aero-tools > *, .topbar button').all()) {
        if (!await control.isVisible()) continue;
        expect(overlaps(card, await control.boundingBox()), `${label}: card covers a top control`).toBe(false);
      }
    }
  });
});


test('language switches relabel live AIRFLOW values before the next HUD tick', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#airflow-toggle').click();
  await expect(page.locator('#aero-flow')).toHaveText('BODY STREAMLINES');
  for (const [locale, expected] of [
    ['zh-TW', ['車身流線', '低風阻', '展示中']],
    ['en', ['BODY STREAMLINES', 'LOW DRAG', 'DEMONSTRATION']],
  ]) {
    // Capture the completed change event, before another animation frame can hide mixed-language text.
    await page.locator('#locale-select').evaluate(select => select.addEventListener('change', () => {
      window.airflowLocaleSnapshot = ['aero-flow', 'aero-floor', 'aero-jet'].map(id => document.getElementById(id).textContent);
    }, { once: true }));
    await selectLocale(page, locale);
    expect(await page.evaluate(() => window.airflowLocaleSnapshot)).toEqual(expected);
  }
});
