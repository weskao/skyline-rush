import { selectLocale } from './helpers/locale-browser.js';
import { test, expect } from './helpers/test.js';
import { RACE_TRACKS } from '../src/game.js';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';
import { brightness } from './helpers/frame-brightness.js';
const ids = Object.keys(RACE_TRACKS);
const upcomingIds = Object.keys(UPCOMING_TRACKS);
const newIds = ['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
const classicIds = ids.filter(id => !newIds.includes(id));
const seed = page => page.addInitScript(ids => {
  localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
  localStorage.setItem('skyline-rush-music', 'off');
}, ids);
test('all home route previews and bilingual names are available without exposing classic shortcuts', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  // The home screen includes the classic catalog AND gated CourseGraph previews. Graph maps legitimately
  // contain multiple ground/flight edges; only classic maps promise a single non-secret centreline.
  const classicMaps = page.locator('[data-track] .track-route-map');
  await expect(page.locator('[data-track]')).toHaveCount(ids.length);
  await expect(page.locator('[data-upcoming-track]')).toHaveCount(upcomingIds.length);
  await expect(page.locator('.track-route-map svg')).toHaveCount(ids.length + upcomingIds.length);
  await expect(classicMaps.locator('polyline.route-overview-line')).toHaveCount(ids.length);
  // Sky Spiral's upper-loop and direction overlays are decoration, not extra roads.
  await expect(classicMaps.locator('polyline:not(.route-overview-line):not(.route-spiral-upper):not(.route-spiral-direction)')).toHaveCount(0);
  await expect(classicMaps.locator('polyline')).toHaveCount(ids.length + 2);
  for (const id of upcomingIds)
    await expect(page.locator(`[data-upcoming-track="${id}"] .route-overview-line`).first(), `${id} has an authored route`).toHaveAttribute('points', /\d/);
  for (const id of ids) await expect(page.locator(`.preview-${id}`), `${id} preview has its own sky`).not.toHaveCSS('background-image', 'none');
  await selectLocale(page, 'zh-TW');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(page.locator('[data-track="taipei"] strong')).toHaveText('台北古都');
  await expect(page.locator('[data-track="cosmic"] strong')).toHaveText('星際軌道');
  await expect(page.locator('#track-length')).toHaveText('5 KM 衝刺賽');
  await selectLocale(page, 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-track="taipei"] strong')).toHaveText('Taipei Heritage');
  await expect(page.locator('#track-length')).toHaveText('5 KM SPRINT');
});
// The classic courses: the flat road in world.js needs WebGL, so only a real frame can check it. The tour courses are covered by
// phase5-world-tour-browser.spec.js (same race start, frame brightness at 1440x900).
for (const id of classicIds) test(`course ${id} renders a lit scene and exposes racer HUD markers`, async ({page}) => {
  await seed(page);
  const errors=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  const button=page.locator(`[data-track="${id}"]`);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#track-note')).not.toBeEmpty();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-route-map [data-racer]')).toHaveCount(8);
  await expect(page.locator('#race-status')).toHaveText('RACING');
  expect(await brightness(page), `${id} frame is not black`).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});
test('live minimap does not duplicate secret corridors and moves marker positions', async ({ page }) => {
  await seed(page);await page.goto('/');
  await page.locator('#start-button').click();
  const map=page.locator('#race-route-map svg');
  await expect(map.locator('polyline')).toHaveCount(1);
  await expect(map.locator('[data-racer]')).toHaveCount(8);
  const marker=map.locator('[data-racer="YOU"]');
  const start=await marker.getAttribute('cy');
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.down('w');
  await expect(marker).not.toHaveAttribute('cy',start);
});

// Real browser output for review, kept in test-results so committed artifacts stay untouched.
test('capture genuine world-tour scenes and race HUD', async ({ page }, testInfo) => {
  const shot = name => page.screenshot({ path: testInfo.outputPath(`world-tour-${name}.png`), animations: 'disabled' });
  await seed(page);
  await page.goto('/');
  for (const id of newIds) {
    await page.locator(`[data-track="${id}"]`).click();
    await page.waitForTimeout(400);
    await shot(`${id}-desktop`);
  }
  await page.locator('[data-track="taipei"]').click();
  await page.locator('#start-button').click();
  await page.waitForTimeout(4300);
  await shot('taipei-race-map');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await shot('taipei-mobile');
});

test('Alpine and Cosmic minimaps expose cached climb and descent cues from the main road',async({page})=>{
 await seed(page);await page.goto('/');
 for(const id of ['alpine','cosmic']){
   const button=page.locator(`[data-track="${id}"]`);
   const overview=button.locator('svg.route-overview');
   await expect(overview.locator('.route-elevation-cue[data-direction="up"]')).toHaveCount(1);
   await expect(overview.locator('.route-elevation-cue[data-direction="down"]')).toHaveCount(1);
   await expect(overview.locator('.route-overview-line')).toHaveCount(1);
   await button.click();
   await page.locator('#start-button').click();
   const live=page.locator('#race-route-map svg.route-overview');
   await expect(live.locator('.route-elevation-cue')).toHaveCount(2);
   await expect(live.locator('[data-racer]')).toHaveCount(8);
   await expect(live).toHaveAttribute('aria-label', /.+/);
   // Cached vectors remain static; only moving racer positions are updated.
   const original=await live.evaluate(el=>(window.__worldTourAltMap=el,el.querySelectorAll('*').length));
   await page.waitForTimeout(400);
   expect(await live.evaluate((el, expected)=>el===window.__worldTourAltMap&&el.querySelectorAll('*').length===expected,original)).toBe(true);
   // Restart to restore the map selector without leaving ghost DOM behind.
   await page.goto('/');
 }
 for(const id of ['taipei','tokyo','coastal']){
   await expect(page.locator(`[data-track="${id}"] .route-elevation-cue`)).toHaveCount(0);
 }
});
